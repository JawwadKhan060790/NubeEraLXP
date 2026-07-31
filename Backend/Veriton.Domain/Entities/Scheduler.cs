using Veriton.Domain.Common;

namespace Veriton.Domain.Entities;

/// <summary>
/// Represents a scheduled class/session for a Grade+Module+Lesson combination.
/// </summary>
public class Scheduler : BaseEntity, IMultiTenant
{
    public Guid SchoolId { get; set; }
    public Guid GradeId { get; set; }
    public Guid? ModuleId { get; set; }
    public Guid? LessonId { get; set; }
    public Guid TeacherId { get; set; }
    public DateTime Date { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public bool IsActive { get; set; } = true;

    /// <summary>Nullable — existing schedules without a section remain valid.</summary>
    public Guid? SectionId { get; set; }

    // Navigation Properties
    public Grade         Grade   { get; set; } = null!;
    public Module?       Module  { get; set; }
    public Lesson?       Lesson  { get; set; }
    public Teacher       Teacher { get; set; } = null!;
    public GradeSection? Section { get; set; }
}
