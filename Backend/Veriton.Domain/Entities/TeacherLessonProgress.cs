using Veriton.Domain.Common;

namespace Veriton.Domain.Entities;

/// <summary>
/// Tracks a teacher's progress status on each Lesson (Topic) within a Grade.
/// Status flows: NotStarted → InProgress → Completed.
/// Used to drive the Teacher Learning Path, Syllabus Completion, and Dashboard metrics.
/// </summary>
public class TeacherLessonProgress : BaseEntity, IMultiTenant
{
    public Guid SchoolId   { get; set; }
    public Guid TeacherId  { get; set; }
    public Guid GradeId    { get; set; }
    public Guid ModuleId   { get; set; }
    public Guid LessonId   { get; set; }
    public Guid? SectionId { get; set; }

    /// <summary>NotStarted | InProgress | Completed</summary>
    public TeacherTopicStatus Status { get; set; } = TeacherTopicStatus.NotStarted;

    public DateTime? StartedAt     { get; set; }
    public DateTime? CompletedAt   { get; set; }

    /// <summary>Free-text remarks the teacher can attach when completing a topic.</summary>
    public string? Remarks { get; set; }

    // Navigation
    public School   School   { get; set; } = null!;
    public Teacher  Teacher  { get; set; } = null!;
    public Grade    Grade    { get; set; } = null!;
    public Module   Module   { get; set; } = null!;
    public Lesson   Lesson   { get; set; } = null!;
    public GradeSection? Section { get; set; }
}

public enum TeacherTopicStatus
{
    NotStarted  = 0,
    InProgress  = 1,
    Completed   = 2
}
