using Microsoft.EntityFrameworkCore;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Repositories;
using NubeEra.Application.Interfaces.Services;
using NubeEra.Domain.Entities;
using NubeEra.Application.Interfaces.Security;

namespace NubeEra.Application.Services;

public class SchedulerService : IGenericService<SchedulerCreateDto, SchedulerUpdateDto, SchedulerDto>
{
    private readonly IGenericRepository<Scheduler> _repository;
    private readonly IGenericRepository<Grade> _gradeRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly ITenantService       _tenantService;
    private readonly IGradeAccessService _gradeAccessService;

    public SchedulerService(
        IGenericRepository<Scheduler> repository,
        IGenericRepository<Grade> gradeRepository,
        ICurrentUserService currentUserService,
        ITenantService tenantService,
        IGradeAccessService gradeAccessService)
    {
        _repository = repository;
        _gradeRepository = gradeRepository;
        _currentUserService = currentUserService;
        _tenantService       = tenantService;
        _gradeAccessService = gradeAccessService;
    }

    public async Task<List<SchedulerDto>> GetAllAsync()
    {
        var schedules = await _repository.GetAllAsync(q => q
            .Include(s => s.Grade)
            .Include(s => s.Section)
            .Include(s => s.Module)
            .Include(s => s.Lesson)
            .Include(s => s.Teacher));

        return schedules.Select(MapToDto).ToList();
    }

    public async Task<SchedulerDto?> GetByIdAsync(Guid id)
    {
        var s = await _repository.GetByIdAsync(id, q => q
            .Include(s => s.Grade)
            .Include(s => s.Section)
            .Include(s => s.Module)
            .Include(s => s.Lesson)
            .Include(s => s.Teacher));
        if (s == null) return null;

        return MapToDto(s);
    }

    public async Task<Guid> CreateAsync(SchedulerCreateDto dto)
    {
        Guid schoolId = _tenantService.GetEffectiveSchoolIdOrEmpty();

        // Centralized enforcement: a schedule entry may only target a grade accessible
        // to the current user (within their school's standardized grade range). Blocks IDOR.
        await _gradeAccessService.EnsureGradeAccessibleToCurrentUserAsync(dto.GradeId);

        // If SchoolId is missing (SuperAdmin), inherit it from the linked Grade
        if (schoolId == Guid.Empty)
        {
            var grade = await _gradeRepository.GetByIdAsync(dto.GradeId, q => q.AsNoTracking());
            if (grade != null) schoolId = grade.SchoolId ?? _currentUserService.SchoolId ?? Guid.Empty;
        }

        var scheduler = new Scheduler
        {
            SchoolId  = schoolId,
            GradeId   = dto.GradeId,
            SectionId = dto.SectionId,
            ModuleId  = dto.ModuleId,
            LessonId  = dto.LessonId,
            TeacherId = dto.TeacherId,
            Date      = dto.Date.Date,
            StartTime = dto.StartTime,
            EndTime   = dto.EndTime,
            IsActive  = true
        };

        await _repository.AddAsync(scheduler);
        return scheduler.Id;
    }

    public async Task UpdateAsync(Guid id, SchedulerUpdateDto dto)
    {
        var scheduler = await _repository.GetByIdAsync(id)
            ?? throw new Exception("Schedule not found");

        await _gradeAccessService.EnsureGradeAccessibleToCurrentUserAsync(dto.GradeId);

        scheduler.GradeId   = dto.GradeId;
        scheduler.SectionId = dto.SectionId;
        scheduler.ModuleId  = dto.ModuleId;
        scheduler.LessonId  = dto.LessonId;
        scheduler.TeacherId = dto.TeacherId;
        scheduler.Date      = dto.Date.Date;
        scheduler.StartTime = dto.StartTime;
        scheduler.EndTime   = dto.EndTime;
        scheduler.IsActive  = dto.IsActive;

        await _repository.UpdateAsync(scheduler);
    }

    public async Task DeleteAsync(Guid id)
    {
        var scheduler = await _repository.GetByIdAsync(id)
            ?? throw new Exception("Schedule not found");

        await _repository.DeleteAsync(scheduler);
    }

    // ── Mapping helper ────────────────────────────────────────────────────────

    private static SchedulerDto MapToDto(Scheduler s) => new()
    {
        Id             = s.Id,
        SchoolId       = s.SchoolId,
        GradeId        = s.GradeId,
        GradeName      = s.Grade?.GradeName ?? "",
        SectionId      = s.SectionId,
        SectionCode    = s.Section?.SectionCode,
        ModuleId       = s.ModuleId,
        ModuleName     = s.Module?.Name ?? "",
        LessonId       = s.LessonId,
        LessonSubTopic = s.Lesson?.SubTopic,
        TeacherId      = s.TeacherId,
        TeacherName    = s.Teacher != null
            ? $"{s.Teacher.FirstName} {s.Teacher.LastName}" : "",
        Date      = s.Date,
        StartTime = s.StartTime,
        EndTime   = s.EndTime,
        IsActive  = s.IsActive
    };
}
