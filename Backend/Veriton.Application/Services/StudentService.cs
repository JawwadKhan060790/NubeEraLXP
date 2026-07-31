using Microsoft.EntityFrameworkCore;
using Veriton.Application.Pagination;
using Veriton.Application.Common.Models;
using Veriton.Application.DTOs;
using Veriton.Application.Interfaces.Repositories;
using Veriton.Application.Interfaces.Services;
using Veriton.Application.Interfaces.Security;
using Veriton.Domain.Entities;
using Veriton.Domain.Common;
using Veriton.Application.Common.Helpers;

namespace Veriton.Application.Services;

public class StudentService : IStudentService
{
    private readonly IGenericRepository<Student> _repository;
    private readonly IUserRepository _userRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly ITenantService       _tenantService;
    private readonly IGenericRepository<LessonCompletion> _completionRepository;
    private readonly IGenericRepository<Lesson> _lessonRepository;
    private readonly IGenericRepository<Role> _roleRepository;
    private readonly IGradeAccessService _gradeAccessService;
    private readonly IGenericRepository<School> _schoolRepository;

    public StudentService(
        IGenericRepository<Student> repository,
        IUserRepository userRepository,
        ICurrentUserService currentUserService,
        ITenantService tenantService,
        IGenericRepository<LessonCompletion> completionRepository,
        IGenericRepository<Lesson> lessonRepository,
        IGenericRepository<Role> roleRepository,
        IGradeAccessService gradeAccessService,
        IGenericRepository<School> schoolRepository)
    {
        _repository = repository;
        _userRepository = userRepository;
        _currentUserService = currentUserService;
        _tenantService       = tenantService;
        _completionRepository = completionRepository;
        _lessonRepository = lessonRepository;
        _roleRepository = roleRepository;
        _gradeAccessService = gradeAccessService;
        _schoolRepository = schoolRepository;
    }

    /// <summary>
    /// Returns ALL students as a list.
    /// ⚠️  INTERNAL USE ONLY — used by the Excel export endpoint which intentionally
    /// fetches the full dataset for a single user-triggered download.
    /// The student list page must use <see cref="GetPagedAsync"/> instead.
    /// </summary>
    public async Task<List<StudentDto>> GetAllAsync()
    {
        // Build a scoped, AsNoTracking query — at least avoid EF tracking overhead.
        var query = _repository.Query().AsNoTracking().Where(s => s.IsActive);
        var effSchool = _tenantService.GetEffectiveSchoolId();
        if (effSchool.HasValue)
            query = query.Where(s => s.SchoolId == effSchool.Value);

        var students = await query
            .Include(s => s.School)
            .Include(s => s.Grade)
            .Include(s => s.Section)
            .OrderBy(s => s.FirstName).ThenBy(s => s.LastName)
            .ToListAsync();

        if (students.Count == 0)
            return new List<StudentDto>();

        // Scoped auxiliary queries — only for the schools/grades we actually loaded.
        var schoolIds  = students.Select(s => s.SchoolId).Distinct().ToList();
        var studentIds = students.Select(s => s.Id).ToList();

        // Topics are now keyed by the master GradeLevelId rather than a student's
        // per-school Grade.Id — build the mapping from the already-Included Grade nav.
        var gradeLevelByGradeId = students
            .Where(s => s.Grade != null)
            .Select(s => new { s.GradeId, s.Grade.GradeLevelId })
            .Distinct()
            .ToDictionary(x => x.GradeId, x => x.GradeLevelId);
        var gradeLevelIds = gradeLevelByGradeId.Values
            .Where(v => v.HasValue).Select(v => v!.Value).Distinct().ToList();

        var completions = await _completionRepository.Query()
            .AsNoTracking()
            .Where(c => schoolIds.Contains(c.SchoolId) && studentIds.Contains(c.StudentId) && c.Lesson.IsActive)
            .Select(c => new { c.StudentId, c.LessonId, GradeLevelId = (Guid?)c.Lesson.Module.GradeLevelId })
            .ToListAsync();

        var completionCountsByStudent = completions
            .Where(c => {
                var studentObj = students.FirstOrDefault(st => st.Id == c.StudentId);
                if (studentObj == null) return false;
                var glId = gradeLevelByGradeId.TryGetValue(studentObj.GradeId, out var val) ? val : null;
                return glId.HasValue && c.GradeLevelId == glId.Value;
            })
            .GroupBy(c => c.StudentId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.LessonId).Distinct().Count());

        var lessonCountsByGradeLevel = await _lessonRepository.Query()
            .AsNoTracking()
            .Include(l => l.Module)
            .Where(l => gradeLevelIds.Contains(l.Module.GradeLevelId) && l.IsActive)
            .GroupBy(l => l.Module.GradeLevelId)
            .Select(g => new { GradeLevelId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.GradeLevelId, x => x.Count);

        return students.Select(s => MapToDto(s,
            gradeLevelByGradeId.TryGetValue(s.GradeId, out var glId) && glId.HasValue
                ? lessonCountsByGradeLevel.GetValueOrDefault(glId.Value, 0)
                : 0,
            completionCountsByStudent.GetValueOrDefault(s.Id, 0))).ToList();
    }

    /// <summary>
    /// Returns a server-side paginated, filtered and sorted page of students.
    /// This is the primary list endpoint — use this for all student list views.
    ///
    /// Key fixes applied here:
    ///  1. AsNoTracking() on the base query — read-only, no change tracking needed.
    ///  2. [NotMapped] FullName removed from LINQ — EF Core cannot translate computed
    ///     properties to SQL. Search is applied to FirstName + LastName + Email + StudentId.
    ///  3. Completion/Lesson counts are fetched with scoped WHERE clauses for the current
    ///     page's students/grades only — eliminates the full-table-scan O(n²) problem.
    ///  4. PageSize and PageNumber are clamped to safe values.
    /// </summary>
    public async Task<PagedResponse<StudentDto>> GetPagedAsync(PaginationRequest request)
    {
        // Guard — clamp to safe values so a malicious/misconfigured caller cannot
        // trigger an uncontrolled full-table load.
        request.PageNumber = Math.Max(1, request.PageNumber);
        request.PageSize   = Math.Clamp(request.PageSize, 1, 200);

        // ── Base query (read-only) ──────────────────────────────────────────────
        var query = _repository.Query().AsNoTracking();

        // Active-status filter: default to active-only; caller can opt-in to inactive.
        if (!request.IsActive.HasValue || request.IsActive.Value)
            query = query.Where(s => s.IsActive);
        else
            query = query.Where(s => !s.IsActive);

        // School scoping — effective school honours body param → X-School-Id header → JWT claim.
        var effSchool = _tenantService.GetEffectiveSchoolId(request.SchoolId);
        if (effSchool.HasValue)
            query = query.Where(s => s.SchoolId == effSchool.Value);

        // ── Search ─────────────────────────────────────────────────────────────
        // IMPORTANT: Do NOT reference s.FullName here — it is [NotMapped] and EF
        // Core will throw InvalidOperationException trying to translate it to SQL.
        // Search first+last separately; the DB index on (FirstName, LastName) covers both.
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim().ToLower();
            query = query.Where(s =>
                s.FirstName.ToLower().Contains(term) ||
                s.LastName.ToLower().Contains(term)  ||
                (s.Email != null && s.Email.ToLower().Contains(term))     ||
                (s.StudentId != null && s.StudentId.ToLower().Contains(term)));
        }

        // ── Grade filter ────────────────────────────────────────────────────────
        // Accept from the typed property first, then fall back to the Filters dictionary.
        var gradeId = request.GradeId;
        if (!gradeId.HasValue
            && request.Filters != null
            && request.Filters.TryGetValue("GradeId", out var gradeIdStr)
            && Guid.TryParse(gradeIdStr, out var parsedGradeId))
        {
            gradeId = parsedGradeId;
        }
        if (gradeId.HasValue)
            query = query.Where(s => s.GradeId == gradeId.Value);

        // ── Count (before paging) ────────────────────────────────────────────────
        var total = await query.CountAsync();

        // ── Sorting ─────────────────────────────────────────────────────────────
        query = ApplySorting(query, request.SortBy, request.SortDirection);

        // ── Pagination ───────────────────────────────────────────────────────────
        var skip = (request.PageNumber - 1) * request.PageSize;
        var pagedStudents = await query
            .Include(s => s.School)
            .Include(s => s.Grade)
            .Include(s => s.Section)
            .Skip(skip)
            .Take(request.PageSize)
            .ToListAsync();

        if (pagedStudents.Count == 0)
            return new PagedResponse<StudentDto>
            {
                Items    = Array.Empty<StudentDto>(),
                TotalCount = total,
                Page     = request.PageNumber,
                PageSize = request.PageSize
            };

        // ── Progress calculation — SCOPED to this page only ───────────────────────
        // FIX: Previously this loaded EVERY completion and EVERY lesson (full table scans).
        // Now we only query for the students and grades visible on the current page.
        var studentIds = pagedStudents.Select(s => s.Id).ToList();

        // Topics are now keyed by the master GradeLevelId rather than a student's
        // per-school Grade.Id — build the mapping from the already-Included Grade nav.
        var pageGradeLevelByGradeId = pagedStudents
            .Where(s => s.Grade != null)
            .Select(s => new { s.GradeId, s.Grade.GradeLevelId })
            .Distinct()
            .ToDictionary(x => x.GradeId, x => x.GradeLevelId);
        var pageGradeLevelIds = pageGradeLevelByGradeId.Values
            .Where(v => v.HasValue).Select(v => v!.Value).Distinct().ToList();

        // Completion counts per student — WHERE StudentId IN (this page's IDs)
        var completions = await _completionRepository.Query()
            .AsNoTracking()
            .Where(c => studentIds.Contains(c.StudentId) && c.Lesson.IsActive)
            .Select(c => new { c.StudentId, c.LessonId, GradeLevelId = (Guid?)c.Lesson.Module.GradeLevelId })
            .ToListAsync();

        var completionCountsByStudent = completions
            .Where(c => {
                var studentObj = pagedStudents.FirstOrDefault(st => st.Id == c.StudentId);
                if (studentObj == null) return false;
                var glId = pageGradeLevelByGradeId.TryGetValue(studentObj.GradeId, out var val) ? val : null;
                return glId.HasValue && c.GradeLevelId == glId.Value;
            })
            .GroupBy(c => c.StudentId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.LessonId).Distinct().Count());

        // Lesson counts per grade level — WHERE GradeLevelId IN (this page's grade levels)
        var lessonCountsByGradeLevel = await _lessonRepository.Query()
            .AsNoTracking()
            .Include(l => l.Module)
            .Where(l => pageGradeLevelIds.Contains(l.Module.GradeLevelId) && l.IsActive)
            .GroupBy(l => l.Module.GradeLevelId)
            .Select(g => new { GradeLevelId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.GradeLevelId, x => x.Count);

        var items = pagedStudents.Select(s => MapToDto(
            s,
            pageGradeLevelByGradeId.TryGetValue(s.GradeId, out var glId) && glId.HasValue
                ? lessonCountsByGradeLevel.GetValueOrDefault(glId.Value, 0)
                : 0,
            completionCountsByStudent.GetValueOrDefault(s.Id, 0)
        )).ToList();

        return new PagedResponse<StudentDto>
        {
            Items    = items,
            TotalCount = total,
            Page     = request.PageNumber,
            PageSize = request.PageSize
        };
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private static IQueryable<Student> ApplySorting(
        IQueryable<Student> query,
        string? sortBy,
        string? sortDirection)
    {
        var desc = "DESC".Equals(sortDirection, StringComparison.OrdinalIgnoreCase);

        return (sortBy?.ToLowerInvariant()) switch
        {
            "fullname" or "full_name" or "name" =>
                desc ? query.OrderByDescending(s => s.FirstName).ThenByDescending(s => s.LastName)
                     : query.OrderBy(s => s.FirstName).ThenBy(s => s.LastName),

            "studentid" or "student_id" =>
                desc ? query.OrderByDescending(s => s.StudentId)
                     : query.OrderBy(s => s.StudentId),

            "email" =>
                desc ? query.OrderByDescending(s => s.Email)
                     : query.OrderBy(s => s.Email),

            "admissiondate" or "admission_date" =>
                desc ? query.OrderByDescending(s => s.AdmissionDate)
                     : query.OrderBy(s => s.AdmissionDate),

            // Default — sort by name ascending
            _ => query.OrderBy(s => s.FirstName).ThenBy(s => s.LastName)
        };
    }

    private static StudentDto MapToDto(Student s, int totalLessons, int completedCount) =>
        new()
        {
            Id                  = s.Id,
            UserId              = s.UserId,
            SchoolId            = s.SchoolId,
            SchoolName          = s.School?.Name ?? "",
            GradeId             = s.GradeId,
            GradeName           = s.Grade?.GradeName ?? "",
            SectionId           = s.SectionId,
            SectionCode         = s.Section?.SectionCode,
            SectionName         = s.Section?.SectionName,
            StudentId           = s.StudentId,
            RollNo              = s.RollNo,
            FirstName           = s.FirstName,
            LastName            = s.LastName,
            FullName            = $"{s.FirstName} {s.LastName}",
            Email               = s.Email,
            Phone               = s.Phone,
            DateOfBirth         = s.DateOfBirth,
            Gender              = s.Gender,
            BloodGroup          = s.BloodGroup,
            Address             = s.Address,
            AdmissionDate       = s.AdmissionDate,
            ParentGuardianName  = s.ParentGuardianName,
            ParentGuardianPhone = s.ParentGuardianPhone,
            ParentGuardianEmail = s.ParentGuardianEmail,
            EmergencyContact    = s.EmergencyContact,
            PersonalNote        = s.PersonalNote,
            IsActive            = s.IsActive,
            ProgressPercentage  = totalLessons == 0
                ? 0
                : Math.Round((double)completedCount / totalLessons * 100, 2)
        };

    public async Task<StudentDto?> GetByIdAsync(Guid id)
    {
        var s = await _repository.GetByIdAsync(id, q =>
        {
            IQueryable<Student> query = q.Include(s => s.School).Include(s => s.Grade).Include(s => s.Section);
            var effSchoolLookup = _tenantService.GetEffectiveSchoolId();
            if (effSchoolLookup.HasValue)
            {
                query = query.Where(s => s.SchoolId == effSchoolLookup.Value);
            }
            return query;
        });

        if (s == null || !s.IsActive) return null;

        return new StudentDto
        {
            Id = s.Id,
            UserId = s.UserId,
            SchoolId = s.SchoolId,
            SchoolName = s.School?.Name ?? "",
            GradeId             = s.GradeId,
            GradeName           = s.Grade?.GradeName ?? "",
            SectionId           = s.SectionId,
            SectionCode         = s.Section?.SectionCode,
            SectionName         = s.Section?.SectionName,
            StudentId           = s.StudentId,
            RollNo              = s.RollNo,
            FirstName           = s.FirstName,
            LastName            = s.LastName,
            FullName            = $"{s.FirstName} {s.LastName}",
            Email               = s.Email,
            Phone               = s.Phone,
            DateOfBirth         = s.DateOfBirth,
            Gender              = s.Gender,
            BloodGroup          = s.BloodGroup,
            Address             = s.Address,
            AdmissionDate       = s.AdmissionDate,
            ParentGuardianName  = s.ParentGuardianName,
            ParentGuardianPhone = s.ParentGuardianPhone,
            ParentGuardianEmail = s.ParentGuardianEmail,
            EmergencyContact    = s.EmergencyContact,
            PersonalNote        = s.PersonalNote,
            IsActive            = s.IsActive
        };
    }

    public async Task<Guid> CreateAsync(StudentCreateDto dto)
    {
        var schoolId = _tenantService.GetEffectiveSchoolIdOrEmpty(dto.SchoolId);

        if (schoolId == Guid.Empty)
            throw new AppException("School assignment is required for student enrollment.");

        if (!string.IsNullOrWhiteSpace(dto.Email))
        {
            var existingUser = await _userRepository.GetByEmailAsync(dto.Email.ToLower().Trim());
            if (existingUser != null)
                throw new AppException($"A user with email '{dto.Email}' already exists.");
        }

        // Auto-generate a unique StudentId when the caller leaves it blank (e.g. DP-260001).
        if (string.IsNullOrWhiteSpace(dto.StudentId))
        {
            dto.StudentId = await StudentIdGenerator.GenerateNextStudentIdAsync(schoolId, _schoolRepository, _repository);
        }
        else
        {
            var existingStudent = await _repository.CountAsync(q =>
                q.Where(s => s.SchoolId == schoolId && s.StudentId == dto.StudentId && s.IsActive));

            if (existingStudent > 0)
                throw new AppException($"Student ID '{dto.StudentId}' is already in use in this school.");
        }

        // Centralized enforcement: a student may only be enrolled into a grade accessible
        // to the current user (within their school's standardized grade range). Blocks IDOR.
        await _gradeAccessService.EnsureGradeAccessibleToCurrentUserAsync(dto.GradeId);

        User? user = null;

        if (!string.IsNullOrEmpty(dto.Email))
        {
            var studentRole = (await _roleRepository.GetAllAsync(q =>
                q.Where(r => r.RoleName == "Student"))).FirstOrDefault()
                ?? throw new AppException("Student role not found in database.");

            user = new User(
                email: dto.Email.ToLower().Trim(),
                passwordHash: BCrypt.Net.BCrypt.HashPassword(dto.Password),
                roleId: studentRole.Id,
                schoolId: schoolId
            );

            user.FirstName = dto.FirstName;
            user.LastName = dto.LastName;
            user.Phone = dto.Phone;

            await _userRepository.AddAsync(user);
        }

        var student = new Student
        {
            SchoolId  = schoolId,
            GradeId   = dto.GradeId,
            SectionId = dto.SectionId,
            UserId    = user?.Id,
            StudentId = dto.StudentId,
            RollNo = dto.RollNo,
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Email = dto.Email,
            Phone = dto.Phone,
            DateOfBirth = dto.DateOfBirth,
            Gender = dto.Gender,
            BloodGroup = dto.BloodGroup,
            Address = dto.Address,
            AdmissionDate = dto.AdmissionDate ?? DateTime.UtcNow,
            ParentGuardianName = dto.ParentGuardianName,
            ParentGuardianPhone = dto.ParentGuardianPhone,
            ParentGuardianEmail = dto.ParentGuardianEmail,
            EmergencyContact = dto.EmergencyContact,
            PersonalNote = dto.PersonalNote,
            IsActive = true
        };

        await _repository.AddAsync(student);
        await SyncParentUserAsync(dto, schoolId);

        return student.Id;
    }

    public async Task UpdateAsync(Guid id, StudentUpdateDto dto)
    {
        var student = await _repository.GetByIdAsync(id)
            ?? throw new Exception("Student not found");

        var effUpdate = _tenantService.GetEffectiveSchoolId();
        if (effUpdate.HasValue && student.SchoolId != effUpdate.Value)
            throw new UnauthorizedAccessException("You are not authorized to modify students from another school.");

        if (_tenantService.CanSelectSchool() && dto.SchoolId.HasValue)
            student.SchoolId = dto.SchoolId.Value;

        await _gradeAccessService.EnsureGradeAccessibleToCurrentUserAsync(dto.GradeId);

        student.GradeId   = dto.GradeId;
        student.SectionId = dto.SectionId;
        student.StudentId = dto.StudentId;
        student.RollNo = dto.RollNo;
        student.FirstName = dto.FirstName;
        student.LastName = dto.LastName;
        student.Email = dto.Email;
        student.Phone = dto.Phone;
        student.DateOfBirth = dto.DateOfBirth;
        student.Gender = dto.Gender;
        student.BloodGroup = dto.BloodGroup;
        student.Address = dto.Address;
        student.AdmissionDate = dto.AdmissionDate;
        student.ParentGuardianName = dto.ParentGuardianName;
        student.ParentGuardianPhone = dto.ParentGuardianPhone;
        student.ParentGuardianEmail = dto.ParentGuardianEmail;
        student.EmergencyContact = dto.EmergencyContact;
        student.PersonalNote = dto.PersonalNote;
        student.IsActive = dto.IsActive;

        await _repository.UpdateAsync(student);
        await SyncParentUserAsync(dto, student.SchoolId);

        if (student.UserId.HasValue)
        {
            var user = await _userRepository.GetByIdAsync(student.UserId.Value);

            if (user != null)
            {
                user.FirstName = dto.FirstName;
                user.LastName = dto.LastName;
                user.Phone = dto.Phone;
                user.SchoolId = student.SchoolId;
                if (dto.IsActive) user.Activate();
                else user.Deactivate();
                await _userRepository.UpdateAsync(user);
            }
        }
    }

    public async Task DeleteAsync(Guid id)
    {
        var student = await _repository.GetByIdAsync(id)
            ?? throw new Exception("Student not found");

        var effDelete = _tenantService.GetEffectiveSchoolId();
        if (effDelete.HasValue && student.SchoolId != effDelete.Value)
            throw new UnauthorizedAccessException("You are not authorized to delete students from another school.");

        student.IsActive = false;

        await _repository.UpdateAsync(student);

        if (student.UserId.HasValue)
        {
            var user = await _userRepository.GetByIdAsync(student.UserId.Value);

            if (user != null)
            {
                user.Deactivate();
                await _userRepository.UpdateAsync(user);
            }
        }
    }

    /// <summary>
    /// Imports students from a CSV stream.
    /// Returns the number of records successfully created.
    /// Implements <see cref="IStudentService.BulkImportCsvAsync"/>.
    /// </summary>
    public async Task<int> BulkImportCsvAsync(Stream stream)
    {
        using var reader = new StreamReader(stream);
        // Skip header row
        await reader.ReadLineAsync();

        int created = 0;
        string? line;

        while ((line = await reader.ReadLineAsync()) != null)
        {
            if (string.IsNullOrWhiteSpace(line)) continue;

            var values = line.Split(',');
            if (values.Length < 5) continue;

            var dto = new StudentCreateDto
            {
                FirstName = values[0].Trim(),
                LastName  = values[1].Trim(),
                Email     = values[2].Trim(),
                StudentId = values[3].Trim(),
                GradeId   = Guid.TryParse(values[4].Trim(), out var gid) ? gid : Guid.Empty,
                Password  = "Student@123"
            };

            try
            {
                await CreateAsync(dto);
                created++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($@"[CSV Import Error] {ex.Message}");
            }
        }

        return created;
    }

    /// <summary>
    /// Returns a lightweight progress summary for a specific student.
    /// Used by parent/student dashboard widgets.
    /// </summary>
    public async Task<StudentProgressDto?> GetProgressAsync(Guid studentId)
    {
        var student = await _repository.Query()
            .AsNoTracking()
            .Include(s => s.Grade)
            .FirstOrDefaultAsync(s => s.Id == studentId && s.IsActive);

        if (student == null) return null;

        // Topics are keyed by the master GradeLevelId, not the student's per-school Grade.Id.
        var studentGradeLevelId = student.Grade?.GradeLevelId;
        var totalLessons = studentGradeLevelId.HasValue
            ? await _lessonRepository.Query()
                .AsNoTracking()
                .Include(l => l.Module)
                .CountAsync(l => l.Module.GradeLevelId == studentGradeLevelId.Value && l.IsActive)
            : 0;

        var completedLessons = studentGradeLevelId.HasValue
            ? await _completionRepository.Query()
                .AsNoTracking()
                .Where(c => c.StudentId == studentId && c.Lesson.Module.GradeLevelId == studentGradeLevelId.Value && c.Lesson.IsActive)
                .Select(c => c.LessonId)
                .Distinct()
                .CountAsync()
            : 0;

        return new StudentProgressDto
        {
            StudentId       = student.Id,
            StudentName     = $"{student.FirstName} {student.LastName}",
            TotalLessons    = totalLessons,
            CompletedLessons = completedLessons
        };
    }

    /// <summary>
    /// Returns the full dashboard statistics for a specific student.
    /// Used by the student-facing dashboard.
    /// </summary>
    public async Task<StudentDashboardDto?> GetDashboardAsync(Guid studentId)
    {
        var student = await _repository.Query()
            .AsNoTracking()
            .Include(s => s.School)
            .Include(s => s.Grade)
            .Include(s => s.Section)
            .FirstOrDefaultAsync(s => s.Id == studentId && s.IsActive);

        if (student == null) return null;

        // All completions for this student
        var completionIds = await _completionRepository.Query()
            .AsNoTracking()
            .Where(c => c.StudentId == studentId)
            .Select(c => c.LessonId)
            .Distinct()
            .ToListAsync();

        // All lessons in this student's grade level (master content, school-agnostic)
        var studentGradeLevelId = student.Grade?.GradeLevelId;
        var gradeLessons = studentGradeLevelId.HasValue
            ? await _lessonRepository.Query()
                .AsNoTracking()
                .Include(l => l.Module)
                .Where(l => l.Module.GradeLevelId == studentGradeLevelId.Value && l.IsActive)
                .ToListAsync()
            : new List<Lesson>();

        var totalLessons    = gradeLessons.Count;
        var gradeLessonIds  = gradeLessons.Select(l => l.Id).ToHashSet();
        var completedCount  = completionIds.Count(id => gradeLessonIds.Contains(id));
        var pendingCount    = Math.Max(0, totalLessons - completedCount);

        var modulesProgress = gradeLessons
            .GroupBy(l => l.Module)
            .Select(g =>
            {
                var total     = g.Count();
                var completed = g.Count(l => completionIds.Contains(l.Id));
                return new StudentModuleProgressDto
                {
                    ModuleId            = g.Key.Id,
                    ModuleName          = g.Key.Name,
                    TotalLessons        = total,
                    CompletedLessons    = completed,
                    PendingLessons      = total - completed,
                    CompletionPercentage = total == 0 ? 0 : Math.Round((double)completed / total * 100, 2)
                };
            }).ToList();

        return new StudentDashboardDto
        {
            StudentName                  = $"{student.FirstName} {student.LastName}",
            GradeName                    = student.Grade?.GradeName ?? "",
            SchoolName                   = student.School?.Name ?? "",
            SectionCode                  = student.Section?.SectionCode,
            SectionName                  = student.Section?.SectionName,
            StudentId                    = student.StudentId,
            RollNo                       = student.RollNo,
            TotalModules                 = modulesProgress.Count,
            CompletedLessons             = completedCount,
            PendingLessons               = pendingCount,
            SyllabusCompletionPercentage = totalLessons == 0 ? 0 : Math.Round((double)completedCount / totalLessons * 100, 2),
            ModulesProgress              = modulesProgress
        };
    }

    private async Task SyncParentUserAsync(StudentCreateDto dto, Guid schoolId)
    {
        if (string.IsNullOrWhiteSpace(dto.ParentGuardianPhone)) return;

        var parentPhone = dto.ParentGuardianPhone.Trim();
        var parentName = dto.ParentGuardianName?.Trim() ?? "Parent";
        var parentEmail = dto.ParentGuardianEmail?.Trim().ToLower();

        var parentUser = await _userRepository.GetByEmailOrPhoneAsync(parentPhone);

        if (parentUser == null && !string.IsNullOrEmpty(parentEmail))
            parentUser = await _userRepository.GetByEmailOrPhoneAsync(parentEmail);

        if (parentUser == null)
        {
            var emailToUse = parentEmail;

            if (string.IsNullOrEmpty(emailToUse))
            {
                emailToUse = $"{parentPhone}@veriton.parent";
            }
            else
            {
                var existingByEmail = await _userRepository.GetByEmailOrPhoneAsync(emailToUse);

                if (existingByEmail != null)
                    emailToUse = $"{parentPhone}@veriton.parent";
            }

            var passwordToUse = !string.IsNullOrEmpty(dto.ParentPassword)
                ? dto.ParentPassword
                : parentPhone;

            var passwordHash = BCrypt.Net.BCrypt.HashPassword(passwordToUse);

            var parentRole = (await _roleRepository.GetAllAsync(q =>
                q.Where(r => r.RoleName == "Parent"))).FirstOrDefault()
                ?? throw new AppException("Parent role not found in database.");

            var newParent = new User(
                email: emailToUse,
                passwordHash: passwordHash,
                roleId: parentRole.Id,
                schoolId: schoolId
            )
            {
                FirstName = parentName,
                LastName = "",
                Phone = parentPhone
            };

            await _userRepository.AddAsync(newParent);
        }
        else
        {
            bool updated = false;

            if (parentUser.FirstName != parentName)
            {
                parentUser.FirstName = parentName;
                updated = true;
            }

            if (!string.IsNullOrEmpty(dto.ParentPassword))
            {
                parentUser.UpdatePassword(BCrypt.Net.BCrypt.HashPassword(dto.ParentPassword));
                updated = true;
            }

            var parentRole = (await _roleRepository.GetAllAsync(q =>
                q.Where(r => r.RoleName == "Parent"))).FirstOrDefault()
                ?? throw new AppException("Parent role not found in database.");

            if (parentUser.RoleId != parentRole.Id)
            {
                parentUser.SetRole(parentRole.Id);
                updated = true;
            }

            if (parentUser.Phone != parentPhone)
            {
                parentUser.Phone = parentPhone;
                updated = true;
            }

            if (updated)
                await _userRepository.UpdateAsync(parentUser);
        }
    }

    public async Task ResetParentPasswordAsync(Guid studentId, string newPassword)
    {
        var student = await _repository.GetByIdAsync(studentId)
            ?? throw new AppException("Student not found");

        var effSchool = _tenantService.GetEffectiveSchoolId();
        if (effSchool.HasValue && student.SchoolId != effSchool.Value)
            throw new UnauthorizedAccessException("You are not authorized to modify students from another school.");

        if (string.IsNullOrWhiteSpace(newPassword))
            throw new AppException("Password cannot be empty.");

        User? parentUser = null;
        if (!string.IsNullOrWhiteSpace(student.ParentGuardianEmail))
            parentUser = await _userRepository.GetByEmailOrPhoneAsync(student.ParentGuardianEmail.Trim());

        if (parentUser == null && !string.IsNullOrWhiteSpace(student.ParentGuardianPhone))
            parentUser = await _userRepository.GetByEmailOrPhoneAsync(student.ParentGuardianPhone.Trim());

        if (parentUser == null && !string.IsNullOrWhiteSpace(student.ParentGuardianPhone))
            parentUser = await _userRepository.GetByEmailOrPhoneAsync($"{student.ParentGuardianPhone.Trim()}@veriton.parent");

        if (parentUser == null)
        {
            var parentEmail = !string.IsNullOrWhiteSpace(student.ParentGuardianEmail)
                ? student.ParentGuardianEmail.Trim()
                : (!string.IsNullOrWhiteSpace(student.ParentGuardianPhone) ? $"{student.ParentGuardianPhone}@veriton.parent" : null);

            if (string.IsNullOrEmpty(parentEmail))
                throw new AppException("Cannot reset parent password: student has no guardian email or phone registered.");

            var parentRole = (await _roleRepository.GetAllAsync(q => q.Where(r => r.RoleName == "Parent"))).FirstOrDefault()
                ?? throw new AppException("Parent role not found in database.");

            parentUser = new User(
                email: parentEmail,
                passwordHash: BCrypt.Net.BCrypt.HashPassword(newPassword),
                roleId: parentRole.Id,
                schoolId: student.SchoolId
            )
            {
                FirstName = !string.IsNullOrWhiteSpace(student.ParentGuardianName) ? student.ParentGuardianName : "Parent",
                LastName = "",
                Phone = student.ParentGuardianPhone
            };

            await _userRepository.AddAsync(parentUser);
        }
        else
        {
            parentUser.UpdatePassword(BCrypt.Net.BCrypt.HashPassword(newPassword));
            await _userRepository.UpdateAsync(parentUser);
        }
    }

    public async Task<string> GetNextStudentIdAsync(Guid schoolId)
    {
        return await StudentIdGenerator.GenerateNextStudentIdAsync(schoolId, _schoolRepository, _repository);
    }
}
