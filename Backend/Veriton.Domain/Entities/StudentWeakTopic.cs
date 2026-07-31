using Veriton.Domain.Common;

namespace Veriton.Domain.Entities;

/// <summary>
/// Records a student's identified weakness on a specific Lesson (Topic).
/// Populated automatically from Exam/Quiz results, attendance impact, and
/// topic-level assessment scores. Teachers can also create records manually.
/// </summary>
public class StudentWeakTopic : BaseEntity, IMultiTenant
{
    public Guid SchoolId  { get; set; }
    public Guid StudentId { get; set; }
    public Guid GradeId   { get; set; }
    public Guid ModuleId  { get; set; }
    public Guid LessonId  { get; set; }

    /// <summary>Low | Medium | High</summary>
    public WeaknessLevel WeaknessLevel { get; set; } = WeaknessLevel.Medium;

    /// <summary>Exam | Quiz | Assignment | Assessment | Teacher</summary>
    public WeaknessSource Source { get; set; } = WeaknessSource.Exam;

    public decimal Score      { get; set; }
    public decimal MaxScore   { get; set; }
    public int     Attempts   { get; set; } = 1;

    public DateTime LastAssessmentDate { get; set; }

    /// <summary>Auto-generated or teacher-written revision suggestion.</summary>
    public string? RecommendedRevision { get; set; }

    public bool IsResolved { get; set; } = false;
    public DateTime? ResolvedAt { get; set; }

    // Navigation
    public School   School   { get; set; } = null!;
    public Student  Student  { get; set; } = null!;
    public Grade    Grade    { get; set; } = null!;
    public Module   Module   { get; set; } = null!;
    public Lesson   Lesson   { get; set; } = null!;
}

public enum WeaknessLevel
{
    Low    = 0,
    Medium = 1,
    High   = 2
}

public enum WeaknessSource
{
    Exam       = 0,
    Quiz       = 1,
    Assignment = 2,
    Assessment = 3,
    Teacher    = 4
}
