using Microsoft.EntityFrameworkCore;
using NubeEra.Application.DTOs.Academic;
using NubeEra.Application.Interfaces.Repositories;
using NubeEra.Application.Interfaces.Security;
using NubeEra.Application.Interfaces.Services;
using NubeEra.Domain.Entities;

namespace NubeEra.Application.Services;

public class StudentDoubtService : IStudentDoubtService
{
    private readonly IGenericRepository<StudentDoubt> _repo;
    private readonly IGenericRepository<Student>      _studentRepo;
    private readonly IGenericRepository<Lesson>       _lessonRepo;
    private readonly IGenericRepository<Module>       _moduleRepo;
    private readonly IGenericRepository<Grade>        _gradeRepo;
    private readonly ICurrentUserService              _currentUser;
    private readonly ITenantService                   _tenant;

    public StudentDoubtService(
        IGenericRepository<StudentDoubt> repo,
        IGenericRepository<Student>      studentRepo,
        IGenericRepository<Lesson>       lessonRepo,
        IGenericRepository<Module>       moduleRepo,
        IGenericRepository<Grade>        gradeRepo,
        ICurrentUserService              currentUser,
        ITenantService                   tenant)
    {
        _repo        = repo;
        _studentRepo = studentRepo;
        _lessonRepo  = lessonRepo;
        _moduleRepo  = moduleRepo;
        _gradeRepo   = gradeRepo;
        _currentUser = currentUser;
        _tenant      = tenant;
    }

    // ── Student: Raise ────────────────────────────────────────────────────────

    public async Task<StudentDoubtDto> RaiseDoubtAsync(StudentDoubtCreateDto dto)
    {
        var studentId = _currentUser.StudentId
            ?? throw new UnauthorizedAccessException("Only students can raise doubts.");

        // Load student to get grade / section / school
        var student = (await _studentRepo.GetAllAsync(q =>
            q.Include(s => s.Grade)
             .Include(s => s.Section)
             .Include(s => s.School)
             .Where(s => s.Id == studentId)
             .IgnoreQueryFilters()))
            .FirstOrDefault()
            ?? throw new Exception("Student record not found.");

        // Optional: resolve ModuleId from LessonId
        Guid? moduleId = null;
        if (dto.LessonId.HasValue)
        {
            var lesson = await _lessonRepo.GetByIdAsync(dto.LessonId.Value);
            moduleId = lesson?.ModuleId;
        }

        var doubt = new StudentDoubt
        {
            SchoolId      = student.SchoolId,
            StudentId     = studentId,
            GradeId       = student.GradeId,
            SectionId     = student.SectionId,
            LessonId      = dto.LessonId,
            ModuleId      = moduleId,
            Title         = dto.Title,
            Description   = dto.Description,
            ScreenshotUrl = dto.ScreenshotUrl,
            Status        = "Open",
            CreatedAt     = DateTime.UtcNow
        };

        await _repo.AddAsync(doubt);

        return await GetDoubtByIdAsync(doubt.Id)
            ?? throw new Exception("Failed to retrieve saved doubt.");
    }

    // ── Student: My Doubts ────────────────────────────────────────────────────

    public async Task<List<StudentDoubtListItemDto>> GetMyDoubtsAsync()
    {
        var studentId = _currentUser.StudentId ?? Guid.Empty;
        if (studentId == Guid.Empty) return new();

        var doubts = await _repo.GetAllAsync(q =>
            q.Include(d => d.Student)
             .Include(d => d.School)
             .Include(d => d.Grade)
             .Include(d => d.Section)
             .Include(d => d.Lesson)
             .Include(d => d.Module)
             .Where(d => d.StudentId == studentId)
             .OrderByDescending(d => d.CreatedAt)
             .IgnoreQueryFilters());

        return doubts.Select(ToListItem).ToList();
    }

    // ── Get by ID ─────────────────────────────────────────────────────────────

    public async Task<StudentDoubtDto?> GetDoubtByIdAsync(Guid id)
    {
        var doubts = await _repo.GetAllAsync(q =>
            q.Include(d => d.Student)
             .Include(d => d.School)
             .Include(d => d.Grade)
             .Include(d => d.Section)
             .Include(d => d.Lesson)
             .Include(d => d.Module)
             .Include(d => d.RepliedByTeacher)
             .Where(d => d.Id == id)
             .IgnoreQueryFilters());

        var d = doubts.FirstOrDefault();
        return d == null ? null : ToFullDto(d);
    }

    // ── Teacher: Grade Doubts ─────────────────────────────────────────────────

    public async Task<List<StudentDoubtListItemDto>> GetGradeDoubtsAsync()
    {
        var schoolId = _tenant.GetEffectiveSchoolIdOrEmpty();
        var gradeIds = new List<Guid>();

        if (_currentUser.Role == "Teacher" && _currentUser.TeacherId.HasValue)
        {
            var teacherId = _currentUser.TeacherId.Value;
            var teacherGrades = await _gradeRepo.GetAllAsync(q =>
                q.Where(g => g.SchoolId == schoolId && g.ClassTeacherId == teacherId)
                 .IgnoreQueryFilters());

            gradeIds.AddRange(teacherGrades.Select(g => g.Id));

            if (!gradeIds.Any())
            {
                var allSchoolGrades = await _gradeRepo.GetAllAsync(q =>
                    q.Where(g => g.SchoolId == schoolId)
                     .IgnoreQueryFilters());
                gradeIds.AddRange(allSchoolGrades.Select(g => g.Id));
            }
        }
        else if (_currentUser.GradeId.HasValue)
        {
            gradeIds.Add(_currentUser.GradeId.Value);
        }

        var doubts = await _repo.GetAllAsync(q =>
            q.Include(d => d.Student)
             .Include(d => d.School)
             .Include(d => d.Grade)
             .Include(d => d.Section)
             .Include(d => d.Lesson)
             .Include(d => d.Module)
             .Where(d => d.SchoolId == schoolId && gradeIds.Contains(d.GradeId))
             .OrderByDescending(d => d.CreatedAt)
             .IgnoreQueryFilters());

        return doubts.Select(ToListItem).ToList();
    }

    // ── Staff/Admin: All Doubts ───────────────────────────────────────────────

    public async Task<(List<StudentDoubtListItemDto> Items, int TotalCount)> GetAllDoubtsAsync(StudentDoubtFilterDto filters)
    {
        var allDoubts = await _repo.GetAllAsync(q =>
        {
            var query = q
                .Include(d => d.Student)
                .Include(d => d.School)
                .Include(d => d.Grade)
                .Include(d => d.Section)
                .Include(d => d.Lesson)
                .Include(d => d.Module)
                .AsQueryable()
                .IgnoreQueryFilters();

            if (filters.SchoolId.HasValue)
                query = query.Where(d => d.SchoolId == filters.SchoolId.Value);
            if (filters.GradeId.HasValue)
                query = query.Where(d => d.GradeId == filters.GradeId.Value);
            if (filters.SectionId.HasValue)
                query = query.Where(d => d.SectionId == filters.SectionId.Value);
            if (!string.IsNullOrWhiteSpace(filters.Status))
                query = query.Where(d => d.Status == filters.Status);
            if (!string.IsNullOrWhiteSpace(filters.Search))
            {
                var s = filters.Search.ToLower();
                query = query.Where(d =>
                    d.Title.ToLower().Contains(s) ||
                    d.Student.FirstName.ToLower().Contains(s) ||
                    d.Student.LastName.ToLower().Contains(s));
            }

            return query.OrderByDescending(d => d.CreatedAt);
        });

        var total = allDoubts.Count;
        var paged = allDoubts
            .Skip((filters.Page - 1) * filters.PageSize)
            .Take(filters.PageSize)
            .Select(ToListItem)
            .ToList();

        return (paged, total);
    }

    // ── Teacher: Reply ────────────────────────────────────────────────────────

    public async Task ReplyAsync(Guid doubtId, StudentDoubtReplyDto dto)
    {
        var teacherId = _currentUser.TeacherId
            ?? throw new UnauthorizedAccessException("Only teachers can reply to doubts.");

        var doubts = await _repo.GetAllAsync(q => q.Where(d => d.Id == doubtId).IgnoreQueryFilters());
        var doubt = doubts.FirstOrDefault()
            ?? throw new Exception("Doubt not found.");

        if (doubt.Status == "Closed")
            throw new Exception("Cannot reply to a closed doubt.");

        doubt.TeacherReply     = dto.Reply;
        doubt.RepliedAt        = DateTime.UtcNow;
        doubt.RepliedByTeacherId = teacherId;
        doubt.Status           = "Answered";
        doubt.UpdatedDate      = DateTime.UtcNow;

        await _repo.UpdateAsync(doubt);
    }

    // ── Teacher/Staff: Close ──────────────────────────────────────────────────

    public async Task CloseAsync(Guid doubtId)
    {
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("Must be authenticated.");

        var doubts = await _repo.GetAllAsync(q => q.Where(d => d.Id == doubtId).IgnoreQueryFilters());
        var doubt = doubts.FirstOrDefault()
            ?? throw new Exception("Doubt not found.");

        if (doubt.Status == "Closed")
            return; // idempotent

        doubt.Status        = "Closed";
        doubt.ClosedAt      = DateTime.UtcNow;
        doubt.ClosedByUserId = Guid.TryParse(userId, out var uid) ? uid : null;
        doubt.UpdatedDate   = DateTime.UtcNow;

        await _repo.UpdateAsync(doubt);
    }

    // ── Student: Delete own doubt ─────────────────────────────────────────────

    public async Task DeleteAsync(Guid doubtId)
    {
        var studentId = _currentUser.StudentId
            ?? throw new UnauthorizedAccessException("Only students can delete their own doubts.");

        var doubts = await _repo.GetAllAsync(q => q.Where(d => d.Id == doubtId && d.StudentId == studentId).IgnoreQueryFilters());
        var doubt = doubts.FirstOrDefault()
            ?? throw new Exception("Doubt not found or access denied.");

        if (doubt.Status != "Open")
            throw new Exception("Can only delete open doubts.");

        await _repo.DeleteAsync(doubt);
    }

    // ── Student: Lessons for grade ────────────────────────────────────────────

    public async Task<List<LessonDropdownDto>> GetLessonsForStudentGradeAsync()
    {
        var gradeLevelId = _currentUser.GradeLevelId;
        if (!gradeLevelId.HasValue) return new();

        var modules = await _moduleRepo.GetAllAsync(q =>
            q.Include(m => m.Lessons)
             .Where(m => m.GradeLevelId == gradeLevelId.Value && m.IsActive)
             .IgnoreQueryFilters());

        var result = new List<LessonDropdownDto>();
        foreach (var mod in modules.OrderBy(m => m.Name))
        {
            foreach (var lesson in mod.Lessons.Where(l => !l.IsDeleted).OrderBy(l => l.DisplayOrder).ThenBy(l => l.SerialNumber))
            {
                result.Add(new LessonDropdownDto
                {
                    Id       = lesson.Id,
                    SubTopic = lesson.SubTopic,
                    ModuleId = mod.Id,
                    ModuleName = mod.Name
                });
            }
        }
        return result;
    }

    // ── Mappers ───────────────────────────────────────────────────────────────

    private static StudentDoubtListItemDto ToListItem(StudentDoubt d) => new()
    {
        Id          = d.Id,
        Title       = d.Title,
        Status      = d.Status,
        StudentName = d.Student != null ? $"{d.Student.FirstName} {d.Student.LastName}" : "",
        SchoolName  = d.School?.Name ?? "",
        GradeName   = d.Grade?.GradeName ?? "",
        SectionName = d.Section?.SectionCode ?? d.Section?.SectionName,
        LessonTitle = d.Lesson?.SubTopic,
        ModuleName  = d.Module?.Name,
        ScreenshotUrl = d.ScreenshotUrl,
        HasReply    = !string.IsNullOrWhiteSpace(d.TeacherReply),
        CreatedAt   = d.CreatedAt
    };

    private static StudentDoubtDto ToFullDto(StudentDoubt d) => new()
    {
        Id          = d.Id,
        Title       = d.Title,
        Description = d.Description,
        ScreenshotUrl = d.ScreenshotUrl,
        Status      = d.Status,
        StudentId   = d.StudentId,
        StudentName = d.Student != null ? $"{d.Student.FirstName} {d.Student.LastName}" : "",
        StudentEmail = d.Student?.Email ?? "",
        SchoolId    = d.SchoolId,
        SchoolName  = d.School?.Name ?? "",
        GradeId     = d.GradeId,
        GradeName   = d.Grade?.GradeName ?? "",
        SectionId   = d.SectionId,
        SectionName = d.Section?.SectionCode ?? d.Section?.SectionName,
        LessonId    = d.LessonId,
        LessonTitle = d.Lesson?.SubTopic,
        ModuleId    = d.ModuleId,
        ModuleName  = d.Module?.Name,
        TeacherReply = d.TeacherReply,
        RepliedAt   = d.RepliedAt,
        RepliedByTeacher = d.RepliedByTeacher != null
            ? $"{d.RepliedByTeacher.FirstName} {d.RepliedByTeacher.LastName}"
            : null,
        CreatedAt   = d.CreatedAt,
        ClosedAt    = d.ClosedAt
    };

}
