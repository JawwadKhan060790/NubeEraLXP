using NubeEra.Domain.Common;

namespace NubeEra.Domain.Entities;

/// <summary>
/// Represents an Exam within a Grade+Module, created by a Teacher.
/// </summary>
public class Exam : BaseEntity, IMultiTenant
{
    public Guid SchoolId { get; set; }
    public Guid GradeId { get; set; }
    public Guid ModuleId { get; set; }
    public Guid? LessonId { get; set; }
    public DateTime Date { get; set; }
    public Guid? CreatedByTeacherId { get; set; }
    public string? Title { get; set; }
    public int? TotalMarks { get; set; }
    public int? PassingMarks { get; set; } // Default passing marks
    public int? DurationMinutes { get; set; }
    public bool IsActive { get; set; } = true;

    /// <summary>Nullable — exams can target an entire grade or a specific section.</summary>
    public Guid? SectionId { get; set; }

    // Navigation Properties
    public Grade         Grade            { get; set; } = null!;
    public Module        Module           { get; set; } = null!;
    public Lesson?       Lesson           { get; set; }
    public Teacher?      CreatedByTeacher { get; set; }
    public GradeSection? Section          { get; set; }
    public ICollection<Question> Questions { get; set; } = new List<Question>();
}
