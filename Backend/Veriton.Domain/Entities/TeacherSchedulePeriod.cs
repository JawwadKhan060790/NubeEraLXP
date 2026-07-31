using Veriton.Domain.Common;

namespace Veriton.Domain.Entities;

/// <summary>
/// Tracks the real-time status of each scheduled period for a teacher.
/// One row per Scheduler entry per day, created lazily when the teacher
/// first interacts with (or when a daily job seeds) the schedule.
/// Status: NotStarted (Blue) | InProgress (Orange) | Completed (Green) | Missed (Red)
/// Completing a period triggers cascading updates to TeacherLessonProgress.
/// </summary>
public class TeacherSchedulePeriod : BaseEntity, IMultiTenant
{
    public Guid SchoolId    { get; set; }
    public Guid SchedulerId { get; set; }   // FK → Scheduler
    public Guid TeacherId   { get; set; }
    public Guid GradeId     { get; set; }

    /// <summary>Calendar date this period instance belongs to.</summary>
    public DateTime PeriodDate { get; set; }

    public PeriodStatus Status { get; set; } = PeriodStatus.NotStarted;

    public DateTime? ActualStartTime { get; set; }
    public DateTime? ActualEndTime   { get; set; }

    /// <summary>Teacher notes recorded at period completion.</summary>
    public string? Remarks { get; set; }

    // Navigation
    public School    School    { get; set; } = null!;
    public Scheduler Scheduler { get; set; } = null!;
    public Teacher   Teacher   { get; set; } = null!;
    public Grade     Grade     { get; set; } = null!;
}

public enum PeriodStatus
{
    NotStarted = 0,
    InProgress = 1,
    Completed  = 2,
    Missed     = 3
}
