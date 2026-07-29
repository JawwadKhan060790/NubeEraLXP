using Microsoft.EntityFrameworkCore;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Repositories;
using NubeEra.Application.Interfaces.Services;
using NubeEra.Domain.Entities;
using NubeEra.Application.Interfaces.Security;

namespace NubeEra.Application.Services;

public class ExamService : IGenericService<ExamCreateDto, ExamUpdateDto, ExamDto>
{
    private readonly IGenericRepository<Exam> _repository;
    private readonly ICurrentUserService _currentUserService;
    private readonly ITenantService       _tenantService;
    private readonly IGradeAccessService _gradeAccessService;
    private readonly IGenericRepository<InAppNotification> _notificationRepository;
    private readonly IGenericRepository<Student> _studentRepository;
    private readonly IGenericRepository<Grade> _gradeRepository;

    public ExamService(
        IGenericRepository<Exam> repository, 
        ICurrentUserService currentUserService, 
        IGradeAccessService gradeAccessService, 
        ITenantService tenantService,
        IGenericRepository<InAppNotification> notificationRepository,
        IGenericRepository<Student> studentRepository,
        IGenericRepository<Grade> gradeRepository)
    {
        _repository = repository;
        _currentUserService = currentUserService;
        _tenantService       = tenantService;
        _gradeAccessService = gradeAccessService;
        _notificationRepository = notificationRepository;
        _studentRepository = studentRepository;
        _gradeRepository = gradeRepository;
    }

    public async Task<List<ExamDto>> GetAllAsync()
    {
        var schoolId = _tenantService.GetEffectiveSchoolId();
        var gradeId  = _currentUserService.GradeId; // non-null only for Student JWT

        var exams = await _repository.GetAllAsync(q =>
        {
            var query = q.IgnoreQueryFilters()
                .Include(e => e.Grade)
                .Include(e => e.Module)
                .Include(e => e.Lesson)
                .Include(e => e.CreatedByTeacher)
                .Include(e => e.Questions)
                .Where(e => !e.IsDeleted && e.IsActive);

            // Tenant-scope: restrict to current school when one is in context
            if (schoolId.HasValue)
                query = query.Where(e => e.SchoolId == schoolId.Value);

            // Student scope: only their grade's exams
            if (gradeId.HasValue)
                query = query.Where(e => e.GradeId == gradeId.Value);

            return query;
        });

        return exams.Select(e => new ExamDto
        {
            Id = e.Id,
            SchoolId = e.SchoolId,
            GradeId = e.GradeId,
            GradeName = e.Grade?.GradeName ?? "",
            ModuleId = e.ModuleId,
            ModuleName = e.Module?.Name ?? "",
            LessonId = e.LessonId,
            LessonName = e.Lesson?.SubTopic ?? "",
            Date = e.Date,
            CreatedByTeacherId = e.CreatedByTeacherId,
            CreatedByTeacherName = e.CreatedByTeacher != null
                ? $"{e.CreatedByTeacher.FirstName} {e.CreatedByTeacher.LastName}" : "",
            Title = e.Title,
            TotalMarks = e.TotalMarks,
            PassingMarks = e.PassingMarks,
            DurationMinutes = e.DurationMinutes,
            IsActive = e.IsActive,
            QuestionCount = e.Questions?.Count ?? 0,
            CreatedAt = e.CreatedAt
        }).ToList();
    }

    public async Task<ExamDto?> GetByIdAsync(Guid id)
    {
        var schoolId = _tenantService.GetEffectiveSchoolId();
        var gradeId  = _currentUserService.GradeId;

        var e = await _repository.GetByIdAsync(id, q => {
            var query = q.IgnoreQueryFilters()
                .Include(e => e.Grade)
                .Include(e => e.Module)
                .Include(e => e.Lesson)
                .Include(e => e.CreatedByTeacher)
                .Include(e => e.Questions)
                .Where(e => !e.IsDeleted);

            if (schoolId.HasValue)
                query = query.Where(e => e.SchoolId == schoolId.Value);

            if (gradeId.HasValue)
                query = query.Where(e => e.GradeId == gradeId.Value);

            return query;
        });
        if (e == null) return null;

        return new ExamDto
        {
            Id = e.Id,
            SchoolId = e.SchoolId,
            GradeId = e.GradeId,
            GradeName = e.Grade?.GradeName ?? "",
            ModuleId = e.ModuleId,
            ModuleName = e.Module?.Name ?? "",
            LessonId = e.LessonId,
            LessonName = e.Lesson?.SubTopic ?? "",
            Date = e.Date,
            CreatedByTeacherId = e.CreatedByTeacherId,
            CreatedByTeacherName = e.CreatedByTeacher != null
                ? $"{e.CreatedByTeacher.FirstName} {e.CreatedByTeacher.LastName}" : "",
            Title = e.Title,
            TotalMarks = e.TotalMarks,
            PassingMarks = e.PassingMarks,
            DurationMinutes = e.DurationMinutes,
            IsActive = e.IsActive,
            QuestionCount = e.Questions?.Count ?? 0,
            CreatedAt = e.CreatedAt
        };
    }

    public async Task<Guid> CreateAsync(ExamCreateDto dto)
    {
        var schoolId = _tenantService.GetEffectiveSchoolIdOrEmpty();
        var teacherId = dto.CreatedByTeacherId ?? _currentUserService.TeacherId;

        // Centralized enforcement: an exam may only target a grade that is accessible
        // to the current user (within their school's standardized 1st-10th grade range,
        // and belonging to their own school). Blocks IDOR via a manipulated GradeId.
        await _gradeAccessService.EnsureGradeAccessibleToCurrentUserAsync(dto.GradeId);

        if (schoolId == Guid.Empty)
        {
            var grade = await _gradeRepository.GetByIdAsync(dto.GradeId);
            if (grade != null)
            {
                schoolId = grade.SchoolId ?? _currentUserService.SchoolId ?? Guid.Empty;
            }
        }

        var exam = new Exam
        {
            SchoolId = dto.SchoolId != Guid.Empty ? dto.SchoolId : schoolId,
            GradeId = dto.GradeId,
            ModuleId = dto.ModuleId,
            LessonId = dto.LessonId,
            Date = dto.Date,
            CreatedByTeacherId = teacherId,
            Title = dto.Title,
            TotalMarks = dto.TotalMarks,
            PassingMarks = dto.PassingMarks,
            DurationMinutes = dto.DurationMinutes,
            IsActive = true
        };

        await _repository.AddAsync(exam);

        try
        {
            var students = await _studentRepository.GetAllAsync(q => q
                .Where(s => s.GradeId == exam.GradeId && s.IsActive && s.UserId != null));

            foreach (var student in students)
            {
                var existingNotifs = await _notificationRepository.GetAllAsync(q => q
                    .Where(n => n.UserId == student.UserId!.Value && !n.IsRead && n.LinkUrl == "/exams"));
                
                var unreadNotif = existingNotifs.FirstOrDefault();
                if (unreadNotif != null)
                {
                    unreadNotif.Message = "New MCQ tests have been scheduled for your grade.";
                    unreadNotif.CreatedAt = DateTime.UtcNow;
                    await _notificationRepository.UpdateAsync(unreadNotif);
                }
                else
                {
                    await _notificationRepository.AddAsync(new InAppNotification
                    {
                        Id = Guid.NewGuid(),
                        UserId = student.UserId!.Value,
                        Message = $"A new MCQ test \"{exam.Title}\" has been scheduled for your grade.",
                        LinkUrl = "/exams",
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }
        }
        catch (Exception)
        {
            // Fail-safe to avoid blocking exam creation if notification delivery fails
        }

        return exam.Id;
    }

    public async Task UpdateAsync(Guid id, ExamUpdateDto dto)
    {
        var exam = await _repository.GetByIdAsync(id)
            ?? throw new Exception("Exam not found");

        await _gradeAccessService.EnsureGradeAccessibleToCurrentUserAsync(dto.GradeId);

        var schoolId = _tenantService.GetEffectiveSchoolIdOrEmpty();
        if (schoolId == Guid.Empty)
        {
            var grade = await _gradeRepository.GetByIdAsync(dto.GradeId);
            if (grade != null)
            {
                schoolId = grade.SchoolId ?? _currentUserService.SchoolId ?? Guid.Empty;
            }
        }

        if (schoolId != Guid.Empty)
        {
            exam.SchoolId = schoolId;
        }

        exam.GradeId = dto.GradeId;
        exam.ModuleId = dto.ModuleId;
        exam.LessonId = dto.LessonId;
        exam.Date = dto.Date;
        exam.CreatedByTeacherId = dto.CreatedByTeacherId ?? exam.CreatedByTeacherId;
        exam.Title = dto.Title;
        exam.TotalMarks = dto.TotalMarks;
        exam.PassingMarks = dto.PassingMarks;
        exam.DurationMinutes = dto.DurationMinutes;
        exam.IsActive = dto.IsActive;

        await _repository.UpdateAsync(exam);
    }

    public async Task DeleteAsync(Guid id)
    {
        var exam = await _repository.GetByIdAsync(id)
            ?? throw new Exception("Exam not found");

        await _repository.DeleteAsync(exam);
    }
}
