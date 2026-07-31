using Microsoft.EntityFrameworkCore;
using Veriton.Application.DTOs;
using Veriton.Application.Interfaces.Repositories;
using Veriton.Application.Interfaces.Security;
using Veriton.Application.Interfaces.Services;
using Veriton.Domain.Entities;

namespace Veriton.Application.Services;

public class TeacherSchedulePeriodService : ITeacherSchedulePeriodService
{
    private readonly IGenericRepository<TeacherSchedulePeriod> _periodRepo;
    private readonly IGenericRepository<TeacherLessonProgress> _progressRepo;
    private readonly IGenericRepository<Scheduler>             _schedulerRepo;
    private readonly IGenericRepository<Teacher>               _teacherRepo;
    private readonly ICurrentUserService                       _currentUserService;

    public TeacherSchedulePeriodService(
        IGenericRepository<TeacherSchedulePeriod> periodRepo,
        IGenericRepository<TeacherLessonProgress> progressRepo,
        IGenericRepository<Scheduler>             schedulerRepo,
        IGenericRepository<Teacher>               teacherRepo,
        ICurrentUserService                       currentUserService)
    {
        _periodRepo         = periodRepo;
        _progressRepo       = progressRepo;
        _schedulerRepo      = schedulerRepo;
        _teacherRepo        = teacherRepo;
        _currentUserService = currentUserService;
    }

    // ── Daily schedule ───────────────────────────────────────────────────────

    public async Task<TeacherDailyScheduleDto> GetDailyScheduleAsync(Guid teacherId, DateTime date)
    {
        var day = date.Date;

        // Seed period rows for the day if not yet created
        await SeedPeriodsForDateAsync(teacherId, day);

        var schedulers = await _schedulerRepo.GetAllAsync(q =>
            q.Where(s => s.TeacherId == teacherId && s.Date.Date == day)
             .Include(s => s.Grade).Include(s => s.Module).Include(s => s.Lesson).Include(s => s.Section)
             .OrderBy(s => s.StartTime));

        var periods = await _periodRepo.GetAllAsync(q =>
            q.Where(p => p.TeacherId == teacherId && p.PeriodDate.Date == day));
        var periodMap = periods.ToDictionary(p => p.SchedulerId);

        var periodDtos = schedulers.Select(s =>
        {
            periodMap.TryGetValue(s.Id, out var period);
            return MapToPeriodDto(s, period, day);
        }).ToList();

        return new TeacherDailyScheduleDto
        {
            Date      = day,
            DayName   = day.ToString("dddd"),
            Total     = periodDtos.Count,
            Completed = periodDtos.Count(p => p.Status == "Completed"),
            Pending   = periodDtos.Count(p => p.Status is "NotStarted" or "InProgress"),
            Missed    = periodDtos.Count(p => p.Status == "Missed"),
            Periods   = periodDtos
        };
    }

    // ── Weekly schedule ──────────────────────────────────────────────────────

    public async Task<TeacherWeeklyScheduleDto> GetWeeklyScheduleAsync(Guid teacherId, DateTime weekStart)
    {
        var start   = weekStart.Date;
        var end     = start.AddDays(6).Date;
        var days    = new List<TeacherDailyScheduleDto>();

        for (int i = 0; i < 7; i++)
        {
            var day = start.AddDays(i);
            days.Add(await GetDailyScheduleAsync(teacherId, day));
        }

        return new TeacherWeeklyScheduleDto { WeekStart = start, WeekEnd = end, Days = days };
    }

    // ── Monthly calendar ─────────────────────────────────────────────────────

    public async Task<List<TeacherCalendarEventDto>> GetMonthlyCalendarAsync(Guid teacherId, int year, int month)
    {
        var monthStart = new DateTime(year, month, 1);
        var monthEnd   = monthStart.AddMonths(1).AddDays(-1);

        var schedulers = await _schedulerRepo.GetAllAsync(q =>
            q.Where(s => s.TeacherId == teacherId &&
                         s.Date.Date >= monthStart && s.Date.Date <= monthEnd)
             .Include(s => s.Grade).Include(s => s.Module).Include(s => s.Lesson).Include(s => s.Section));

        var schedulerIds = schedulers.Select(s => s.Id).ToHashSet();
        var periods = await _periodRepo.GetAllAsync(q =>
            q.Where(p => p.TeacherId == teacherId &&
                         p.PeriodDate.Date >= monthStart && p.PeriodDate.Date <= monthEnd));
        var periodMap = periods.ToDictionary(p => p.SchedulerId);

        return schedulers.Select(s =>
        {
            periodMap.TryGetValue(s.Id, out var period);
            var status = period?.Status ?? PeriodStatus.NotStarted;
            return new TeacherCalendarEventDto
            {
                PeriodId   = period?.Id ?? Guid.Empty,
                SchedulerId= s.Id,
                Title      = $"{s.Grade?.GradeName ?? "Grade"}{(s.Section != null ? $" - {s.Section.SectionCode}" : "")}{(s.Lesson != null ? $" – {s.Lesson.SubTopic}" : "")}",
                Start      = s.Date.Date.Add(s.StartTime),
                End        = s.Date.Date.Add(s.EndTime),
                Status     = status.ToString(),
                Color      = GetStatusColor(status),
                GradeName  = s.Grade?.GradeName,
                ModuleName = s.Module?.Name,
                LessonName = s.Lesson?.SubTopic,
                SectionId  = s.SectionId,
                SectionName= s.Section?.SectionCode
            };
        }).ToList();
    }

    // ── Update period status ─────────────────────────────────────────────────

    public async Task<TeacherSchedulePeriodDto> UpdatePeriodStatusAsync(
        Guid teacherId, Guid schedulerId, DateTime periodDate, UpdatePeriodStatusDto dto)
    {
        var day = periodDate.Date;

        if (!Enum.TryParse<PeriodStatus>(dto.Status, true, out var statusEnum))
            throw new ArgumentException($"Invalid status: {dto.Status}");

        var existing = (await _periodRepo.GetAllAsync(q =>
            q.Where(p => p.SchedulerId == schedulerId && p.PeriodDate.Date == day)))
            .FirstOrDefault();

        Scheduler? scheduler = await _schedulerRepo.GetByIdAsync(schedulerId,
            q => q.Include(s => s.Grade).Include(s => s.Module).Include(s => s.Lesson).Include(s => s.Section));

        if (scheduler == null) throw new KeyNotFoundException("Scheduler not found.");

        var teacher = await _teacherRepo.GetByIdAsync(teacherId)
            ?? throw new KeyNotFoundException("Teacher not found.");

        if (existing == null)
        {
            existing = new TeacherSchedulePeriod
            {
                SchoolId    = teacher.SchoolId,
                SchedulerId = schedulerId,
                TeacherId   = teacherId,
                GradeId     = scheduler.GradeId,
                PeriodDate  = day,
                Status      = statusEnum,
                Remarks     = dto.Remarks,
                ActualStartTime = dto.ActualStartTime,
                ActualEndTime   = dto.ActualEndTime
            };
            if (statusEnum == PeriodStatus.InProgress)
                existing.ActualStartTime ??= DateTime.UtcNow;
            if (statusEnum == PeriodStatus.Completed)
                existing.ActualEndTime ??= DateTime.UtcNow;

            await _periodRepo.AddAsync(existing);
        }
        else
        {
            existing.Status      = statusEnum;
            existing.Remarks     = dto.Remarks ?? existing.Remarks;
            existing.ActualStartTime = dto.ActualStartTime ?? existing.ActualStartTime;
            existing.ActualEndTime   = dto.ActualEndTime   ?? existing.ActualEndTime;

            if (statusEnum == PeriodStatus.InProgress && existing.ActualStartTime == null)
                existing.ActualStartTime = DateTime.UtcNow;
            if (statusEnum == PeriodStatus.Completed  && existing.ActualEndTime == null)
                existing.ActualEndTime   = DateTime.UtcNow;

            await _periodRepo.UpdateAsync(existing);
        }

        // ── Cascade: when period completed, mark the lesson as Completed in TeacherLessonProgress ──
        if (statusEnum == PeriodStatus.Completed && scheduler.LessonId.HasValue)
        {
            var lessonProg = (await _progressRepo.GetAllAsync(q =>
                q.Where(p => p.TeacherId == teacherId && p.LessonId == scheduler.LessonId.Value)))
                .FirstOrDefault();

            if (lessonProg == null)
            {
                await _progressRepo.AddAsync(new TeacherLessonProgress
                {
                    SchoolId    = teacher.SchoolId,
                    TeacherId   = teacherId,
                    GradeId     = scheduler.GradeId,
                    ModuleId    = scheduler.ModuleId ?? Guid.Empty,
                    LessonId    = scheduler.LessonId.Value,
                    Status      = TeacherTopicStatus.Completed,
                    StartedAt   = existing.ActualStartTime,
                    CompletedAt = existing.ActualEndTime ?? DateTime.UtcNow
                });
            }
            else if (lessonProg.Status != TeacherTopicStatus.Completed)
            {
                lessonProg.Status      = TeacherTopicStatus.Completed;
                lessonProg.CompletedAt = existing.ActualEndTime ?? DateTime.UtcNow;
                await _progressRepo.UpdateAsync(lessonProg);
            }
        }

        return MapToPeriodDto(scheduler, existing, day);
    }

    // ── Seed today's periods ─────────────────────────────────────────────────

    public async Task SeedTodayPeriodsAsync(Guid teacherId) =>
        await SeedPeriodsForDateAsync(teacherId, DateTime.UtcNow.Date);

    private async Task SeedPeriodsForDateAsync(Guid teacherId, DateTime day)
    {
        var teacher = await _teacherRepo.GetByIdAsync(teacherId);
        if (teacher == null) return;

        var schedulers = await _schedulerRepo.GetAllAsync(q =>
            q.Where(s => s.TeacherId == teacherId && s.Date.Date == day));

        var existingPeriods = await _periodRepo.GetAllAsync(q =>
            q.Where(p => p.TeacherId == teacherId && p.PeriodDate.Date == day));
        var existingSchedulerIds = existingPeriods.Select(p => p.SchedulerId).ToHashSet();

        foreach (var s in schedulers.Where(s => !existingSchedulerIds.Contains(s.Id)))
        {
            await _periodRepo.AddAsync(new TeacherSchedulePeriod
            {
                SchoolId    = teacher.SchoolId,
                SchedulerId = s.Id,
                TeacherId   = teacherId,
                GradeId     = s.GradeId,
                PeriodDate  = day,
                Status      = PeriodStatus.NotStarted
            });
        }
    }

    // ── Mapping helpers ──────────────────────────────────────────────────────

    private static TeacherSchedulePeriodDto MapToPeriodDto(Scheduler s, TeacherSchedulePeriod? period, DateTime day)
    {
        var status = period?.Status ?? PeriodStatus.NotStarted;
        return new TeacherSchedulePeriodDto
        {
            Id              = period?.Id ?? Guid.Empty,
            SchedulerId     = s.Id,
            GradeId         = s.GradeId,
            GradeName       = s.Grade?.GradeName ?? "",
            ModuleId        = s.ModuleId,
            ModuleName      = s.Module?.Name,
            LessonId        = s.LessonId,
            LessonName      = s.Lesson?.SubTopic,
            PeriodDate      = day,
            StartTime       = s.StartTime,
            EndTime         = s.EndTime,
            Status          = status.ToString(),
            ActualStartTime = period?.ActualStartTime,
            ActualEndTime   = period?.ActualEndTime,
            Remarks         = period?.Remarks,
            SectionId       = s.SectionId,
            SectionName     = s.Section?.SectionCode
        };
    }

    private static string GetStatusColor(PeriodStatus status) => status switch
    {
        PeriodStatus.NotStarted => "#3B82F6",  // Blue
        PeriodStatus.InProgress => "#F59E0B",  // Orange
        PeriodStatus.Completed  => "#16A34A",  // Green
        PeriodStatus.Missed     => "#DC2626",  // Red
        _                       => "#6B7280"
    };
}
