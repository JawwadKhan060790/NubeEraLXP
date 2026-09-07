using Microsoft.EntityFrameworkCore;
using NubeEra.Application.Pagination;
using NubeEra.Application.Common.Models;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Repositories;
using NubeEra.Application.Interfaces.Services;
using NubeEra.Application.Interfaces.Security;
using NubeEra.Domain.Entities;
using NubeEra.Domain.Common;
using NubeEra.Application.Common.Helpers;

namespace NubeEra.Application.Services;

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
            .Include(s => s.User)
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

        var parentPhones = students.Where(s => !string.IsNullOrWhiteSpace(s.ParentGuardianPhone)).Select(s => s.ParentGuardianPhone!.Trim()).Distinct().ToList();
        var parentEmails = students.Where(s => !string.IsNullOrWhiteSpace(s.ParentGuardianEmail)).Select(s => s.ParentGuardianEmail!.Trim().ToLower()).Distinct().ToList();
        var parentUsers = await _userRepository.Query().AsNoTracking().Where(u => u.IsParent && !u.IsDeleted && u.Username != null && (
            (!string.IsNullOrEmpty(u.Phone) && parentPhones.Contains(u.Phone)) ||
            (!string.IsNullOrEmpty(u.Email) && parentEmails.Contains(u.Email.ToLower()))
        )).Select(u => new { u.Phone, u.Email, u.Username }).ToListAsync();

        string? ResolveParentUsername(Student s)
        {
            var p = parentUsers.FirstOrDefault(pu =>
                (!string.IsNullOrEmpty(s.ParentGuardianPhone) && pu.Phone == s.ParentGuardianPhone.Trim()) ||
                (!string.IsNullOrEmpty(s.ParentGuardianEmail) && pu.Email.Equals(s.ParentGuardianEmail.Trim(), StringComparison.OrdinalIgnoreCase)));
            return p?.Username;
        }

        return students.Select(s => MapToDto(s,
            gradeLevelByGradeId.TryGetValue(s.GradeId, out var glId) && glId.HasValue
                ? lessonCountsByGradeLevel.GetValueOrDefault(glId.Value, 0)
                : 0,
            completionCountsByStudent.GetValueOrDefault(s.Id, 0),
            ResolveParentUsername(s))).ToList();
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

        // School scoping — effective school honours body param → X-School-Id header → JWT claim.
        var effSchool = _tenantService.GetEffectiveSchoolId(request.SchoolId);
        if (effSchool.HasValue)
            query = query.Where(s => s.SchoolId == effSchool.Value);

        // ── Search ─────────────────────────────────────────────────────────────
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim().ToLower();
            query = query.Where(s =>
                s.FirstName.ToLower().Contains(term) ||
                s.LastName.ToLower().Contains(term)  ||
                (s.Email != null && s.Email.ToLower().Contains(term))     ||
                (s.StudentId != null && s.StudentId.ToLower().Contains(term)) ||
                (s.User != null && s.User.Username != null && s.User.Username.ToLower().Contains(term)));
        }

        // ── Grade filter ────────────────────────────────────────────────────────
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

        // ── Section filter ──────────────────────────────────────────────────────
        if (request.Filters != null
            && request.Filters.TryGetValue("SectionId", out var sectionIdStr)
            && Guid.TryParse(sectionIdStr, out var parsedSectionId))
        {
            query = query.Where(s => s.SectionId == parsedSectionId);
        }

        // ── Base filtered query for accurate stats calculation ──────────────────
        var baseFilteredQuery = query.Where(s => !s.School.IsDeleted);

        var totalCount    = await baseFilteredQuery.CountAsync();
        var activeCount   = await baseFilteredQuery.CountAsync(s => s.IsActive);
        var inactiveCount = await baseFilteredQuery.CountAsync(s => !s.IsActive);
        var boysCount     = await baseFilteredQuery.CountAsync(s => s.Gender != null && s.Gender.ToLower() == "male");
        var girlsCount    = await baseFilteredQuery.CountAsync(s => s.Gender != null && s.Gender.ToLower() == "female");

        // ── Status filtering ────────────────────────────────────────────────────
        var filterByActive = true;
        if (request.Filters != null && request.Filters.TryGetValue("isActive", out var isActiveStr))
        {
            if (isActiveStr.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                filterByActive = false;
            }
            else if (bool.TryParse(isActiveStr, out var parsedIsActive))
            {
                query = query.Where(s => s.IsActive == parsedIsActive);
                filterByActive = false;
            }
        }
        if (filterByActive)
        {
            query = query.Where(s => s.IsActive == request.IsActive);
        }

        var pagedCount = await query.CountAsync();

        // ── Sorting ─────────────────────────────────────────────────────────────
        query = ApplySorting(query, request.SortBy, request.SortDirection);

        // ── Pagination ──────────────────────────────────────────────────────────
        var pagedStudents = await query
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Include(s => s.School)
            .Include(s => s.Grade)
            .Include(s => s.Section)
            .Include(s => s.User)
            .ToListAsync();

        if (pagedStudents.Count == 0)
        {
            return new PagedResponse<StudentDto>
            {
                Items         = new List<StudentDto>(),
                TotalCount    = pagedCount,
                ActiveCount   = activeCount,
                InactiveCount = inactiveCount,
                BoysCount     = boysCount,
                GirlsCount    = girlsCount,
                Page          = request.PageNumber,
                PageSize      = request.PageSize
            };
        }

        // ── Scoped auxiliary queries (THIS PAGE ONLY) ───────────────────────────
        var pageSchoolIds  = pagedStudents.Select(s => s.SchoolId).Distinct().ToList();
        var pageStudentIds = pagedStudents.Select(s => s.Id).ToList();

        // Topics are keyed by GradeLevelId — build mapping from already-Included Grade nav.
        var pageGradeLevelByGradeId = pagedStudents
            .Where(s => s.Grade != null)
            .Select(s => new { s.GradeId, s.Grade.GradeLevelId })
            .Distinct()
            .ToDictionary(x => x.GradeId, x => x.GradeLevelId);
        var pageGradeLevelIds = pageGradeLevelByGradeId.Values
            .Where(v => v.HasValue).Select(v => v!.Value).Distinct().ToList();

        // Lesson completions — WHERE SchoolId IN (this page) AND StudentId IN (this page)
        var completions = await _completionRepository.Query()
            .AsNoTracking()
            .Where(c => pageSchoolIds.Contains(c.SchoolId) && pageStudentIds.Contains(c.StudentId) && c.Lesson.IsActive)
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

        var pageParentPhones = pagedStudents.Where(s => !string.IsNullOrWhiteSpace(s.ParentGuardianPhone)).Select(s => s.ParentGuardianPhone!.Trim()).Distinct().ToList();
        var pageParentEmails = pagedStudents.Where(s => !string.IsNullOrWhiteSpace(s.ParentGuardianEmail)).Select(s => s.ParentGuardianEmail!.Trim().ToLower()).Distinct().ToList();
        var pageParentUsers = await _userRepository.Query().AsNoTracking().Where(u => u.IsParent && !u.IsDeleted && u.Username != null && (
            (!string.IsNullOrEmpty(u.Phone) && pageParentPhones.Contains(u.Phone)) ||
            (!string.IsNullOrEmpty(u.Email) && pageParentEmails.Contains(u.Email.ToLower()))
        )).Select(u => new { u.Phone, u.Email, u.Username }).ToListAsync();

        string? ResolvePageParentUsername(Student s)
        {
            var p = pageParentUsers.FirstOrDefault(pu =>
                (!string.IsNullOrEmpty(s.ParentGuardianPhone) && pu.Phone == s.ParentGuardianPhone.Trim()) ||
                (!string.IsNullOrEmpty(s.ParentGuardianEmail) && pu.Email.Equals(s.ParentGuardianEmail.Trim(), StringComparison.OrdinalIgnoreCase)));
            return p?.Username;
        }

        var items = pagedStudents.Select(s => MapToDto(
            s,
            pageGradeLevelByGradeId.TryGetValue(s.GradeId, out var glId) && glId.HasValue
                ? lessonCountsByGradeLevel.GetValueOrDefault(glId.Value, 0)
                : 0,
            completionCountsByStudent.GetValueOrDefault(s.Id, 0),
            ResolvePageParentUsername(s)
        )).ToList();

        return new PagedResponse<StudentDto>
        {
            Items         = items,
            TotalCount    = pagedCount,
            ActiveCount   = activeCount,
            InactiveCount = inactiveCount,
            BoysCount     = boysCount,
            GirlsCount    = girlsCount,
            Page          = request.PageNumber,
            PageSize      = request.PageSize
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

    private static StudentDto MapToDto(Student s, int totalLessons, int completedCount, string? parentUsername = null) =>
        new()
        {
            Id                  = s.Id,
            UserId              = s.UserId,
            Username            = s.User?.Username,
            ParentUsername      = parentUsername,
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
            IQueryable<Student> query = q.Include(s => s.School).Include(s => s.Grade).Include(s => s.Section).Include(s => s.User);
            var effSchoolLookup = _tenantService.GetEffectiveSchoolId();
            if (effSchoolLookup.HasValue)
            {
                query = query.Where(s => s.SchoolId == effSchoolLookup.Value);
            }
            return query;
        });

        if (s == null || !s.IsActive) return null;

        string? parentUsername = null;
        if (!string.IsNullOrWhiteSpace(s.ParentGuardianPhone) || !string.IsNullOrWhiteSpace(s.ParentGuardianEmail))
        {
            var pPhone = s.ParentGuardianPhone?.Trim();
            var pEmail = s.ParentGuardianEmail?.Trim().ToLower();
            var parentUser = await _userRepository.Query().AsNoTracking()
                .FirstOrDefaultAsync(u => u.IsParent && !u.IsDeleted && (
                    (!string.IsNullOrEmpty(pPhone) && (u.Phone == pPhone || u.Email.ToLower() == pPhone.ToLower())) ||
                    (!string.IsNullOrEmpty(pEmail) && (u.Email.ToLower() == pEmail || u.Phone == pEmail))
                ));
            parentUsername = parentUser?.Username;
        }

        return new StudentDto
        {
            Id = s.Id,
            UserId = s.UserId,
            Username = s.User?.Username,
            ParentUsername = parentUsername,
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
            var emailLower = dto.Email.ToLower().Trim();
            var existingUser = await _userRepository.GetByEmailAsync(emailLower);
            if (existingUser != null)
                throw new AppException($"A user with email '{dto.Email}' already exists.");

            // Check if there is a soft-deleted user with this email to free it up
            var deletedUser = await _userRepository.Query()
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.Email.ToLower() == emailLower && u.IsDeleted);

            if (deletedUser != null)
            {
                deletedUser.UpdateEmail(MakeUniqueAfterDelete(deletedUser.Email, deletedUser.Id, 150));
                await _userRepository.UpdateAsync(deletedUser);

                // Also rename their soft-deleted student profile email if they have one
                var deletedStudent = await _repository.Query()
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(s => s.UserId == deletedUser.Id);
                if (deletedStudent != null && deletedStudent.IsDeleted && !string.IsNullOrEmpty(deletedStudent.Email))
                {
                    deletedStudent.Email = MakeUniqueAfterDelete(deletedStudent.Email, deletedStudent.Id, 150);
                    await _repository.UpdateAsync(deletedStudent);
                }
            }
        }

        var studentUsername = (dto.Username ?? dto.StudentUsername)?.Trim();
        if (!string.IsNullOrWhiteSpace(studentUsername))
        {
            var existingUserByUsername = await _userRepository.Query()
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.Username != null && u.Username.ToLower() == studentUsername.ToLower() && !u.IsDeleted);

            if (existingUserByUsername != null)
                throw new AppException($"A user with username '{studentUsername}' already exists.");

            var deletedUser = await _userRepository.Query()
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.Username != null && u.Username.ToLower() == studentUsername.ToLower() && u.IsDeleted);
            if (deletedUser != null)
            {
                deletedUser.Username = MakeUniqueAfterDelete(deletedUser.Username!, deletedUser.Id, 100);
                await _userRepository.UpdateAsync(deletedUser);
            }
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

        if (!string.IsNullOrEmpty(dto.Email) || !string.IsNullOrEmpty(studentUsername))
        {
            var studentRole = (await _roleRepository.GetAllAsync(q =>
                q.Where(r => r.RoleName == "Student"))).FirstOrDefault()
                ?? throw new AppException("Student role not found in database.");

            var emailToUse = !string.IsNullOrEmpty(dto.Email)
                ? dto.Email.ToLower().Trim()
                : $"{studentUsername}@veriton.student";

            user = new User(
                email: emailToUse,
                passwordHash: BCrypt.Net.BCrypt.HashPassword(dto.Password),
                roleId: studentRole.Id,
                schoolId: schoolId,
                username: studentUsername
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
        await SyncParentUserAsync(dto, schoolId, student.UserId);

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

        var studentUsername = (dto.Username ?? dto.StudentUsername)?.Trim();

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

        var callerRole = _currentUserService.Role ?? "";
        bool isAdmin = callerRole.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase) || callerRole.Equals("Admin", StringComparison.OrdinalIgnoreCase);

        // Only Admin accounts can toggle student active/inactive status
        if (isAdmin)
        {
            student.IsActive = dto.IsActive;
        }

        var studentRole = (await _roleRepository.GetAllAsync(q =>
            q.Where(r => r.RoleName == "Student"))).FirstOrDefault();

        // 1. Maintain the Student's OWN user account (ALWAYS Role='Student', IsParent=false)
        if (student.UserId.HasValue)
        {
            var user = await _userRepository.GetByIdAsync(student.UserId.Value);

            if (user != null)
            {
                if (!string.IsNullOrWhiteSpace(studentUsername) && !string.Equals(user.Username, studentUsername, StringComparison.OrdinalIgnoreCase))
                {
                    var duplicateUser = await _userRepository.Query()
                        .IgnoreQueryFilters()
                        .FirstOrDefaultAsync(u => u.Id != user.Id && u.Username != null && u.Username.ToLower() == studentUsername.ToLower() && !u.IsDeleted);
                    if (duplicateUser != null)
                        throw new AppException($"A user with username '{studentUsername}' already exists.");
                }

                user.Username = studentUsername;

                if (studentRole != null && user.RoleId != studentRole.Id)
                {
                    user.SetRole(studentRole.Id);
                }
                user.IsParent = false;
                user.FirstName = dto.FirstName;
                user.LastName = dto.LastName;
                user.Phone = dto.Phone;
                user.SchoolId = student.SchoolId;
                if (isAdmin)
                {
                    if (dto.IsActive) user.Activate();
                    else user.Deactivate();
                }
                await _userRepository.UpdateAsync(user);
            }
        }
        else if ((!string.IsNullOrEmpty(dto.Email) || !string.IsNullOrEmpty(studentUsername)) && studentRole != null)
        {
            var searchEmail = !string.IsNullOrEmpty(dto.Email) ? dto.Email.Trim().ToLower() : $"{studentUsername}@veriton.student";
            var existingStudentUser = await _userRepository.GetByEmailAsync(searchEmail, null);
            if (existingStudentUser == null)
            {
                if (!string.IsNullOrWhiteSpace(studentUsername))
                {
                    var duplicateUser = await _userRepository.Query()
                        .IgnoreQueryFilters()
                        .FirstOrDefaultAsync(u => u.Username != null && u.Username.ToLower() == studentUsername.ToLower() && !u.IsDeleted);
                    if (duplicateUser != null)
                        throw new AppException($"A user with username '{studentUsername}' already exists.");
                }

                var studentPassword = !string.IsNullOrEmpty(dto.Password) ? dto.Password : "123456";
                var user = new User(
                    email: searchEmail,
                    passwordHash: BCrypt.Net.BCrypt.HashPassword(studentPassword),
                    roleId: studentRole.Id,
                    schoolId: student.SchoolId,
                    username: studentUsername
                )
                {
                    FirstName = dto.FirstName,
                    LastName = dto.LastName,
                    Phone = dto.Phone,
                    IsParent = false
                };
                await _userRepository.AddAsync(user);
                student.UserId = user.Id;
            }
            else
            {
                existingStudentUser.Username = studentUsername;
                existingStudentUser.SetRole(studentRole.Id);
                existingStudentUser.IsParent = false;
                await _userRepository.UpdateAsync(existingStudentUser);
                student.UserId = existingStudentUser.Id;
            }
        }

        await _repository.UpdateAsync(student);

        // 2. Sync / Create the SEPARATE Parent User Account
        await SyncParentUserAsync(dto, student.SchoolId, student.UserId);

        if (isAdmin)
        {
            await SyncParentActiveStatusAsync(dto.ParentGuardianPhone, dto.ParentGuardianEmail, student.Id, dto.IsActive);
        }
    }

    public async Task DeleteAsync(Guid id)
    {
        var student = await _repository.GetByIdAsync(id)
            ?? throw new Exception("Student not found");

        var effDelete = _tenantService.GetEffectiveSchoolId();
        if (effDelete.HasValue && student.SchoolId != effDelete.Value)
            throw new UnauthorizedAccessException("You are not authorized to delete students from another school.");

        student.IsDeleted = true;
        student.DeletedDate = DateTime.UtcNow;
        student.IsActive = false;
        if (!string.IsNullOrWhiteSpace(student.Email))
        {
            student.Email = MakeUniqueAfterDelete(student.Email, student.Id, 150);
        }

        await _repository.UpdateAsync(student);

        if (student.UserId.HasValue)
        {
            var user = await _userRepository.GetByIdAsync(student.UserId.Value);

            if (user != null)
            {
                user.IsDeleted = true;
                user.DeletedDate = DateTime.UtcNow;
                user.Deactivate();
                if (!string.IsNullOrWhiteSpace(user.Email))
                {
                    user.UpdateEmail(MakeUniqueAfterDelete(user.Email, user.Id, 150));
                }
                if (!string.IsNullOrWhiteSpace(user.Username))
                {
                    user.Username = MakeUniqueAfterDelete(user.Username, user.Id, 100);
                }
                await _userRepository.UpdateAsync(user);
            }
        }

        await SyncParentActiveStatusAsync(student.ParentGuardianPhone, student.ParentGuardianEmail, student.Id, false, isDelete: true);
    }

    private async Task SyncParentActiveStatusAsync(string? parentPhone, string? parentEmail, Guid studentId, bool activate, bool isDelete = false)
    {
        if (string.IsNullOrWhiteSpace(parentPhone) && string.IsNullOrWhiteSpace(parentEmail))
            return;

        var phone = parentPhone?.Trim();
        var email = parentEmail?.Trim().ToLower();

        var parentUser = await _userRepository.Query()
            .IgnoreQueryFilters()
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Role != null && u.Role.RoleName == "Parent" && (
                (!string.IsNullOrEmpty(phone) && (u.Phone == phone || u.Email.ToLower() == phone.ToLower())) ||
                (!string.IsNullOrEmpty(email) && (u.Email.ToLower() == email || u.Phone == email))));

        if (parentUser == null) return;

        if (activate)
        {
            parentUser.IsDeleted = false;
            parentUser.Activate();
            await _userRepository.UpdateAsync(parentUser);
        }
        else
        {
            // Deactivate parent account only if no other non-deleted active students are linked to this parent
            var otherActiveStudents = await _repository.Query()
                .IgnoreQueryFilters()
                .Where(s =>
                    s.Id != studentId &&
                    !s.IsDeleted &&
                    s.IsActive &&
                    ((!string.IsNullOrEmpty(phone) && (s.ParentGuardianPhone == phone || (s.ParentGuardianEmail != null && s.ParentGuardianEmail.ToLower() == phone))) ||
                     (!string.IsNullOrEmpty(email) && ((s.ParentGuardianEmail != null && s.ParentGuardianEmail.ToLower() == email) || s.ParentGuardianPhone == email))))
                .ToListAsync();

            if (!otherActiveStudents.Any())
            {
                if (isDelete)
                {
                    parentUser.IsDeleted = true;
                    parentUser.DeletedDate = DateTime.UtcNow;
                    if (!string.IsNullOrWhiteSpace(parentUser.Email))
                    {
                        parentUser.UpdateEmail(MakeUniqueAfterDelete(parentUser.Email, parentUser.Id, 150));
                    }
                    if (!string.IsNullOrWhiteSpace(parentUser.Username))
                    {
                        parentUser.Username = MakeUniqueAfterDelete(parentUser.Username, parentUser.Id, 100);
                    }
                }
                parentUser.Deactivate();
                await _userRepository.UpdateAsync(parentUser);
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

    private async Task SyncParentUserAsync(StudentCreateDto dto, Guid schoolId, Guid? currentStudentUserId = null)
    {
        if (string.IsNullOrWhiteSpace(dto.ParentGuardianPhone) && string.IsNullOrWhiteSpace(dto.ParentGuardianEmail)) return;

        var parentPhone = dto.ParentGuardianPhone?.Trim();
        var parentName = !string.IsNullOrWhiteSpace(dto.ParentGuardianName) ? dto.ParentGuardianName.Trim() : "Parent";
        var parentEmail = dto.ParentGuardianEmail?.Trim().ToLower();

        var parentRole = (await _roleRepository.GetAllAsync(q =>
            q.Where(r => r.RoleName == "Parent"))).FirstOrDefault()
            ?? throw new AppException("Parent role not found in database.");

        var studentRole = (await _roleRepository.GetAllAsync(q =>
            q.Where(r => r.RoleName == "Student"))).FirstOrDefault();

        User? parentUser = null;

        // Search ONLY for users who are already a PARENT and NOT any student user account
        if (!string.IsNullOrWhiteSpace(parentPhone))
        {
            var query = _userRepository.Query()
                .IgnoreQueryFilters()
                .Where(u => u.RoleId == parentRole.Id || (u.IsParent && (studentRole == null || u.RoleId != studentRole.Id)));
            if (currentStudentUserId.HasValue)
            {
                query = query.Where(u => u.Id != currentStudentUserId.Value);
            }
            parentUser = await query.FirstOrDefaultAsync(u => u.Phone == parentPhone || u.Email.ToLower() == parentPhone.ToLower());
        }

        if (parentUser == null && !string.IsNullOrEmpty(parentEmail))
        {
            var query = _userRepository.Query()
                .IgnoreQueryFilters()
                .Where(u => u.RoleId == parentRole.Id || (u.IsParent && (studentRole == null || u.RoleId != studentRole.Id)));
            if (currentStudentUserId.HasValue)
            {
                query = query.Where(u => u.Id != currentStudentUserId.Value);
            }
            parentUser = await query.FirstOrDefaultAsync(u => u.Email.ToLower() == parentEmail.ToLower() || u.Phone == parentEmail);
        }

        var parentUsername = dto.ParentUsername?.Trim();
        if (!string.IsNullOrWhiteSpace(parentUsername))
        {
            var existingParentUsername = await _userRepository.Query()
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => (parentUser == null || u.Id != parentUser.Id) && u.Username != null && u.Username.ToLower() == parentUsername.ToLower() && !u.IsDeleted);
            if (existingParentUsername != null)
                throw new AppException($"A user with username '{parentUsername}' already exists.");

            var deletedParentUser = await _userRepository.Query()
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => (parentUser == null || u.Id != parentUser.Id) && u.Username != null && u.Username.ToLower() == parentUsername.ToLower() && u.IsDeleted);
            if (deletedParentUser != null)
            {
                deletedParentUser.Username = MakeUniqueAfterDelete(deletedParentUser.Username!, deletedParentUser.Id, 100);
                await _userRepository.UpdateAsync(deletedParentUser);
            }
        }

        if (parentUser == null)
        {
            // Create a brand NEW SEPARATE parent user account
            var emailToUse = parentEmail;

            if (string.IsNullOrEmpty(emailToUse))
            {
                emailToUse = !string.IsNullOrWhiteSpace(parentPhone)
                    ? $"{parentPhone}@veriton.parent"
                    : (!string.IsNullOrWhiteSpace(parentUsername) ? $"{parentUsername}@veriton.parent" : $"parent_{Guid.NewGuid().ToString("N")[..6]}@veriton.parent");
            }

            // Verify if emailToUse is already in use by another user (e.g. student or staff)
            var existingByEmail = await _userRepository.Query()
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.Email.ToLower() == emailToUse.ToLower());

            if (existingByEmail != null)
            {
                if (existingByEmail.RoleId == parentRole.Id || existingByEmail.IsParent)
                {
                    parentUser = existingByEmail;
                }
                else
                {
                    // Email is used by student/staff — generate unique parent email address
                    emailToUse = !string.IsNullOrWhiteSpace(parentPhone)
                        ? $"parent_{parentPhone}@veriton.parent"
                        : (!string.IsNullOrWhiteSpace(parentUsername) ? $"parent_{parentUsername}@veriton.parent" : $"parent_{Guid.NewGuid().ToString("N")[..6]}@veriton.parent");

                    var conflictCheck = await _userRepository.Query()
                        .IgnoreQueryFilters()
                        .AnyAsync(u => u.Email.ToLower() == emailToUse.ToLower());
                    if (conflictCheck)
                    {
                        emailToUse = $"parent_{Guid.NewGuid().ToString("N")[..8]}@veriton.parent";
                    }
                }
            }

            if (parentUser == null)
            {
                var passwordToUse = !string.IsNullOrEmpty(dto.ParentPassword)
                    ? dto.ParentPassword
                    : "123456";

                var passwordHash = BCrypt.Net.BCrypt.HashPassword(passwordToUse);

                var newParent = new User(
                    email: emailToUse,
                    passwordHash: passwordHash,
                    roleId: parentRole.Id,
                    schoolId: schoolId,
                    username: parentUsername
                )
                {
                    FirstName = parentName,
                    LastName = "",
                    Phone = parentPhone,
                    IsParent = true
                };

                await _userRepository.AddAsync(newParent);
                return;
            }
        }

        if (parentUser != null)
        {
            bool updated = false;

            if (!parentUser.IsParent)
            {
                parentUser.IsParent = true;
                updated = true;
            }

            if (!string.IsNullOrWhiteSpace(parentUsername) && parentUser.Username != parentUsername)
            {
                parentUser.Username = parentUsername;
                updated = true;
            }

            if (parentUser.RoleId != parentRole.Id)
            {
                parentUser.SetRole(parentRole.Id);
                updated = true;
            }

            if (parentUser.IsDeleted)
            {
                parentUser.IsDeleted = false;
                parentUser.DeletedDate = null;
                parentUser.DeletedBy = null;
                updated = true;
            }

            if (!parentUser.IsActive)
            {
                parentUser.Activate();
                updated = true;
            }

            if (parentUser.FirstName != parentName && !string.IsNullOrWhiteSpace(parentName))
            {
                parentUser.FirstName = parentName;
                updated = true;
            }

            if (!string.IsNullOrEmpty(dto.ParentPassword))
            {
                parentUser.UpdatePassword(BCrypt.Net.BCrypt.HashPassword(dto.ParentPassword));
                updated = true;
            }
            else if (string.IsNullOrEmpty(parentUser.PasswordHash))
            {
                parentUser.UpdatePassword(BCrypt.Net.BCrypt.HashPassword("123456"));
                updated = true;
            }

            if (parentUser.SchoolId != schoolId)
            {
                parentUser.SchoolId = schoolId;
                updated = true;
            }

            if (!string.IsNullOrWhiteSpace(parentPhone) && parentUser.Phone != parentPhone)
            {
                parentUser.Phone = parentPhone;
                updated = true;
            }

            if (updated)
            {
                await _userRepository.UpdateAsync(parentUser);
            }
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
                Phone = student.ParentGuardianPhone,
                IsParent = true
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

    private static string MakeUniqueAfterDelete(string original, Guid id, int maxLength)
    {
        var suffix = $"~del~{id:N}";
        var keep = Math.Max(0, maxLength - suffix.Length);
        var trimmedOriginal = original.Length > keep ? original[..keep] : original;
        return trimmedOriginal + suffix;
    }
}
