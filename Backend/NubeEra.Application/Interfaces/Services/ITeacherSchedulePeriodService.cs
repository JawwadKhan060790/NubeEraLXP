using NubeEra.Application.DTOs;

namespace NubeEra.Application.Interfaces.Services;

/// <summary>
/// Teacher Schedule Period — period-level status tracking and calendar views.
/// </summary>
public interface ITeacherSchedulePeriodService
{
    /// <summary>Returns all period-status rows for a teacher on a specific date (today's schedule).</summary>
    Task<TeacherDailyScheduleDto> GetDailyScheduleAsync(Guid teacherId, DateTime date);

    /// <summary>Returns a week view (Mon–Sun) of period statuses for a teacher.</summary>
    Task<TeacherWeeklyScheduleDto> GetWeeklyScheduleAsync(Guid teacherId, DateTime weekStart);

    /// <summary>Returns calendar events for a month (for FullCalendar-style rendering).</summary>
    Task<List<TeacherCalendarEventDto>> GetMonthlyCalendarAsync(Guid teacherId, int year, int month);

    /// <summary>
    /// Update (or create) the status of a period for a specific date.
    /// Completing a period triggers cascading TeacherLessonProgress update.
    /// </summary>
    Task<TeacherSchedulePeriodDto> UpdatePeriodStatusAsync(Guid teacherId, Guid schedulerId, DateTime periodDate, UpdatePeriodStatusDto dto);

    /// <summary>Seeds today's period rows for a teacher (called lazily on first page load).</summary>
    Task SeedTodayPeriodsAsync(Guid teacherId);
}
