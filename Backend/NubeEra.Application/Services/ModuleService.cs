using Microsoft.EntityFrameworkCore;
using NubeEra.Application.DTOs;
using NubeEra.Application.Common.Models;
using NubeEra.Application.Pagination;
using NubeEra.Application.Interfaces.Repositories;
using NubeEra.Application.Interfaces.Services;
using NubeEra.Domain.Entities;
using NubeEra.Application.Interfaces.Security;

namespace NubeEra.Application.Services;

public class ModuleService : IModuleService
{
    private readonly IGenericRepository<Module> _repository;
    private readonly ICurrentUserService _currentUserService;
    private readonly ITenantService       _tenantService;
    private readonly IGenericRepository<Scheduler> _schedulerRepository;
    private readonly IGenericRepository<Exam> _examRepository;
    private readonly IGenericRepository<Result> _resultRepository;
    private readonly IGenericRepository<Question> _questionRepository;
    private readonly IGradeAccessService _gradeAccessService;
    private readonly IGenericRepository<SchoolUnitAssignment> _unitAssignmentRepository;
    private readonly IGenericRepository<Lesson> _lessonRepository;

    public ModuleService(
        IGenericRepository<Module> repository,
        ICurrentUserService currentUserService,
        ITenantService tenantService,
        IGenericRepository<Scheduler> schedulerRepository,
        IGenericRepository<Exam> examRepository,
        IGenericRepository<Result> resultRepository,
        IGenericRepository<Question> questionRepository,
        IGradeAccessService gradeAccessService,
        IGenericRepository<SchoolUnitAssignment> unitAssignmentRepository,
        IGenericRepository<Lesson> lessonRepository)
    {
        _repository = repository; 
        _currentUserService = currentUserService;
        _tenantService       = tenantService;
        _schedulerRepository = schedulerRepository;
        _examRepository = examRepository;
        _resultRepository = resultRepository;
        _questionRepository = questionRepository;
        _gradeAccessService = gradeAccessService;
        _unitAssignmentRepository = unitAssignmentRepository;
        _lessonRepository = lessonRepository;
    }

    // Non‑paginated list – retained for backward compatibility
    public async Task<List<ModuleDto>> GetAllAsync()
    {
            // Units are master content shared across every school at a grade level.
            // For students, restrict to only those Units assigned to their school
            // via SchoolUnitAssignment.
            IQueryable<Module> query = _repository.Query()
                .Include(m => m.GradeLevel)
                .Include(m => m.Subject)
                .Include(m => m.CreatedByTeacher)
                .Include(m => m.Lessons)
                .Include(m => m.Exams);

            // ── Student curriculum scoping ───────────────────────────────────────
            var role = _currentUserService.Role?.ToLower();
            if (role == "student")
            {
                var schoolId = _currentUserService.SchoolId;
                var gradeLevelId = _currentUserService.GradeLevelId;

                if (schoolId.HasValue)
                {
                    // Only show modules assigned to this student's school
                    var assignedUnitIds = await _unitAssignmentRepository
                        .Query()
                        .Where(a => a.SchoolId == schoolId.Value)
                        .Select(a => a.UnitId)
                        .ToListAsync();

                    query = query.Where(m => assignedUnitIds.Contains(m.Id));
                }

                // Also restrict to the student's grade level
                if (gradeLevelId.HasValue)
                {
                    query = query.Where(m => m.GradeLevelId == gradeLevelId.Value);
                }
            }

            var modules = await query.ToListAsync();

        return modules.Select(m => new ModuleDto
        {
            Id = m.Id,
            GradeLevelId = m.GradeLevelId,
            GradeLevelName = m.GradeLevel?.Name ?? "",
            SubjectId = m.SubjectId,
            SubjectName = m.Subject?.Name ?? "",
            Name = m.Name,
            Description = m.Description,
            Credits = m.Credits,
            CreatedByTeacherId = m.CreatedByTeacherId,
            CreatedByTeacherName = m.CreatedByTeacher != null
                ? $"{m.CreatedByTeacher.FirstName} {m.CreatedByTeacher.LastName}" : "System/Admin",
            PdfFileUrl = m.PdfFileUrl,
            IsActive = m.IsActive,
            LessonCount = m.Lessons?.Count ?? 0,
            ExamCount = m.Exams?.Count ?? 0,
            ExpectedPeriods = m.Lessons?.Sum(l => l.ExpectedPeriods) ?? 0
        }).ToList();
    }

    // Paginated endpoint used by the UI to avoid timeouts
    public async Task<PagedResponse<ModuleDto>> GetPagedAsync(PaginationRequest request)
    {
        var query = _repository.Query();
        query = query.Where(m => m.IsActive);

        // Search across key text fields
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim().ToLower();
            query = query.Where(m =>
                (m.Name != null && m.Name.ToLower().Contains(term)) ||
                (m.Description != null && m.Description.ToLower().Contains(term)) ||
                (m.PdfFileUrl != null && m.PdfFileUrl.ToLower().Contains(term)));
        }

        // Grade level filter — supports both typed GradeId param (reused for GradeLevelId)
        // and Filters["GradeLevelId"] dictionary entry.
        if (request.GradeId.HasValue)
            query = query.Where(m => m.GradeLevelId == request.GradeId.Value);
        else if (request.Filters != null && request.Filters.TryGetValue("GradeLevelId", out var gidStr) && Guid.TryParse(gidStr, out var gid))
            query = query.Where(m => m.GradeLevelId == gid);

        if (request.Filters != null && request.Filters.TryGetValue("SubjectId", out var sidStr))
        {
            if (Guid.TryParse(sidStr, out var sid))
                query = query.Where(m => m.SubjectId == sid);
            else if (sidStr == "null" || string.IsNullOrEmpty(sidStr))
                query = query.Where(m => m.SubjectId == null);
        }

        var total = await query.CountAsync();

        // Sorting – default to newest first
        if (!string.IsNullOrWhiteSpace(request.SortBy))
        {
            var desc = request.SortDirection?.Equals("DESC", StringComparison.OrdinalIgnoreCase) ?? false;
            switch (request.SortBy.ToLower())
            {
                case "name":
                    query = desc ? query.OrderByDescending(m => m.Name) : query.OrderBy(m => m.Name);
                    break;
                case "createdat":
                    query = desc ? query.OrderByDescending(m => m.CreatedAt) : query.OrderBy(m => m.CreatedAt);
                    break;
                default:
                    query = desc ? query.OrderByDescending(m => EF.Property<object>(m, request.SortBy))
                                 : query.OrderBy(m => EF.Property<object>(m, request.SortBy));
                    break;
            }
        }
        else
        {
            query = query.OrderByDescending(m => m.CreatedAt);
        }

        var skip = (request.PageNumber - 1) * request.PageSize;

        // Use projection instead of Include(Lessons) + Include(Exams):
        // m.Lessons.Count() and m.Exams.Count() translate to SQL COUNT subqueries —
        // only the count is loaded, not thousands of child records.
        var dtoItems = await query
            .AsNoTracking()
            .Skip(skip)
            .Take(request.PageSize)
            .Select(m => new ModuleDto
            {
                Id = m.Id,
                GradeLevelId = m.GradeLevelId,
                GradeLevelName = m.GradeLevel != null ? m.GradeLevel.Name : "",
                SubjectId = m.SubjectId,
                SubjectName = m.Subject != null ? m.Subject.Name : "",
                Name = m.Name,
                Description = m.Description,
                Credits = m.Credits,
                CreatedByTeacherId = m.CreatedByTeacherId,
                CreatedByTeacherName = m.CreatedByTeacher != null
                    ? m.CreatedByTeacher.FirstName + " " + m.CreatedByTeacher.LastName : "System/Admin",
                PdfFileUrl = m.PdfFileUrl,
                IsActive = m.IsActive,
                LessonCount = m.Lessons.Count(),
                ExamCount = m.Exams.Count(),
                ExpectedPeriods = m.Lessons.Sum(l => l.ExpectedPeriods),
                AssignedSchoolCount = m.SchoolAssignments.Count()
            })
            .ToListAsync();

        // Convert PaginationRequest to the expected PagedRequest model
        var pagedReq = new PagedRequest
        {
            Page = request.PageNumber,
            PageSize = request.PageSize,
            Search = request.Search,
            SortBy = request.SortBy,
            SortDirection = request.SortDirection ?? "asc"
        };
        return PagedResponse<ModuleDto>.Create(dtoItems, total, pagedReq);
    }

    public async Task<ModuleDto?> GetByIdAsync(Guid id)
    {
        var m = await _repository.GetByIdAsync(id, q => q
            .Include(m => m.GradeLevel)
            .Include(m => m.Subject)
            .Include(m => m.CreatedByTeacher)
            .Include(m => m.Lessons)
            .Include(m => m.Exams)
            .Include(m => m.SchoolAssignments));
        if (m == null) return null;

        return new ModuleDto
        {
            Id = m.Id,
            GradeLevelId = m.GradeLevelId,
            GradeLevelName = m.GradeLevel?.Name ?? "",
            SubjectId = m.SubjectId,
            SubjectName = m.Subject?.Name ?? "",
            Name = m.Name,
            Description = m.Description,
            Credits = m.Credits,
            CreatedByTeacherId = m.CreatedByTeacherId,
            CreatedByTeacherName = m.CreatedByTeacher != null
                ? $"{m.CreatedByTeacher.FirstName} {m.CreatedByTeacher.LastName}" : "System/Admin",
            PdfFileUrl = m.PdfFileUrl,
            IsActive = m.IsActive,
            LessonCount = m.Lessons?.Count ?? 0,
            ExamCount = m.Exams?.Count ?? 0,
            ExpectedPeriods = m.Lessons?.Sum(l => l.ExpectedPeriods) ?? 0,
            AssignedSchoolCount = m.SchoolAssignments?.Count ?? 0
        };
    }

    public async Task<Guid> CreateAsync(ModuleCreateDto dto)
    {
        // Units are school-agnostic master content written at a grade level, not tied to
        // the creator's own school — any of the 10 master grade levels may be picked here.
        // Per-school visibility is granted afterwards via SchoolCurriculumAssignment
        // (/admin/curriculum-assignment), which enforces the receiving school's own
        // grade range at assignment time.
        var module = new Module
        {
            GradeLevelId = dto.GradeLevelId,
            SubjectId = dto.SubjectId,
            Name = dto.Name,
            Description = dto.Description,
            Credits = dto.Credits,
            CreatedByTeacherId = dto.CreatedByTeacherId,
            PdfFileUrl = dto.PdfFileUrl,
            IsActive = true
        };

        await _repository.AddAsync(module);
        return module.Id;
    }

    public async Task UpdateAsync(Guid id, ModuleUpdateDto dto)
    {
        var module = await _repository.GetByIdAsync(id) ?? throw new Exception("Module not found");

        module.GradeLevelId = dto.GradeLevelId;
        module.SubjectId = dto.SubjectId;
        module.Name = dto.Name;
        module.Description = dto.Description;
        module.Credits = dto.Credits;
        module.CreatedByTeacherId = dto.CreatedByTeacherId;
        module.PdfFileUrl = dto.PdfFileUrl;
        module.IsActive = dto.IsActive;

        await _repository.UpdateAsync(module);
    }

    public async Task DeleteAsync(Guid id)
    {
        var module = await _repository.GetByIdAsync(id) ?? throw new Exception("Module not found");

        var schedules = await _schedulerRepository.GetAllAsync(q => q.Where(s => s.ModuleId == id));
        foreach (var schedule in schedules)
        {
            schedule.ModuleId = null;
            await _schedulerRepository.UpdateAsync(schedule);
        }

        var questions = await _questionRepository.GetAllAsync(q => q.Where(q => q.ModuleId == id));
        foreach (var question in questions)
        {
            question.ModuleId = null;
            await _questionRepository.UpdateAsync(question);
        }

        var exams = await _examRepository.GetAllAsync(q => q.Where(e => e.ModuleId == id));
        foreach (var exam in exams)
        {
            var results = await _resultRepository.GetAllAsync(q => q.Where(r => r.ExamId == exam.Id));
            foreach (var result in results)
                await _resultRepository.DeleteAsync(result);

            await _examRepository.DeleteAsync(exam);
        }

        var lessons = await _lessonRepository.GetAllAsync(q => q.Where(l => l.ModuleId == id));
        foreach (var lesson in lessons)
        {
            await _lessonRepository.DeleteAsync(lesson);
        }

        await _repository.DeleteAsync(module);
    }
}