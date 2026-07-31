using Microsoft.EntityFrameworkCore;
using Veriton.Application.DTOs;
using Veriton.Application.Interfaces.Repositories;
using Veriton.Application.Interfaces.Services;
using Veriton.Domain.Entities;
using Veriton.Application.Interfaces.Security;

namespace Veriton.Application.Services;

public class SchedulerService : IGenericService<SchedulerCreateDto, SchedulerUpdateDto, SchedulerDto>
{
    private readonly IGenericRepository<Scheduler> _repository;
    private readonly IGenericRepository<Grade> _gradeRepository;
    private readonly IGenericRepository<TeacherSchedulePeriod> _periodRepo;
    private readonly IGenericRepository<TeacherLessonProgress> _progressRepo;
    private readonly ICurrentUserService _currentUserService;
    private readonly ITenantService       _tenantService;
    private readonly IGradeAccessService _gradeAccessService;

    public SchedulerService(
        IGenericRepository<Scheduler> repository,
        IGenericRepository<Grade> gradeRepository,
        IGenericRepository<TeacherSchedulePeriod> periodRepo,
        IGenericRepository<TeacherLessonProgress> progressRepo,
        ICurrentUserService currentUserService,
        ITenantService tenantService,
        IGradeAccessService gradeAccessService)
    {
        _repository = repository;
        _gradeRepository = gradeRepository;
        _periodRepo = periodRepo;
        _progressRepo = progressRepo;
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

        var schedulerIds = schedules.Select(s => s.Id).ToList();
        var periods = await _periodRepo.GetAllAsync(q => q.Where(p => schedulerIds.Contains(p.SchedulerId)));
        var periodMap = periods.GroupBy(p => p.SchedulerId).ToDictionary(g => g.Key, g => g.FirstOrDefault());

        return schedules.Select(s => MapToDto(s, periodMap.GetValueOrDefault(s.Id))).ToList();
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

        var period = (await _periodRepo.GetAllAsync(q => q.Where(p => p.SchedulerId == id))).FirstOrDefault();
        return MapToDto(s, period);
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

        bool dateOrTimeChanged = scheduler.Date.Date != dto.Date.Date ||
                                 scheduler.StartTime != dto.StartTime ||
                                 scheduler.EndTime != dto.EndTime ||
                                 scheduler.LessonId != dto.LessonId ||
                                 scheduler.TeacherId != dto.TeacherId;

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

        // If date/time or session details changed, reset period status & completion state so session restarts from attendance
        if (dateOrTimeChanged)
        {
            var existingPeriods = await _periodRepo.GetAllAsync(q => q.Where(p => p.SchedulerId == id));
            foreach (var period in existingPeriods)
            {
                period.Status = PeriodStatus.NotStarted;
                period.ActualStartTime = null;
                period.ActualEndTime = null;
                period.Remarks = null;
                period.PeriodDate = dto.Date.Date;
                await _periodRepo.UpdateAsync(period);
            }

            if (dto.LessonId.HasValue)
            {
                var progressList = await _progressRepo.GetAllAsync(q =>
                    q.Where(p => p.TeacherId == dto.TeacherId && p.LessonId == dto.LessonId.Value));
                foreach (var prog in progressList)
                {
                    prog.Status = TeacherTopicStatus.NotStarted;
                    prog.CompletedAt = null;
                    await _progressRepo.UpdateAsync(prog);
                }
            }
        }
    }

    public async Task DeleteAsync(Guid id)
    {
        var scheduler = await _repository.GetByIdAsync(id)
            ?? throw new Exception("Schedule not found");

        await _repository.DeleteAsync(scheduler);

        // Soft-delete associated periods so deleted schedule rows don't linger
        var periods = await _periodRepo.GetAllAsync(q => q.Where(p => p.SchedulerId == id));
        foreach (var p in periods)
        {
            await _periodRepo.DeleteAsync(p);
        }
    }

    // ── Mapping helper ────────────────────────────────────────────────────────

    private static SchedulerDto MapToDto(Scheduler s, TeacherSchedulePeriod? period = null) => new()
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
        Date            = s.Date,
        StartTime       = s.StartTime,
        EndTime         = s.EndTime,
        IsActive        = s.IsActive,
        Status          = period?.Status.ToString() ?? "NotStarted",
        ActualStartTime = period?.ActualStartTime,
        ActualEndTime   = period?.ActualEndTime,
        Remarks         = period?.Remarks
    };
}
