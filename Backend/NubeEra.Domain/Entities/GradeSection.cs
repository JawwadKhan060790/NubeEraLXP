using NubeEra.Domain.Common;

namespace NubeEra.Domain.Entities;

/// <summary>
/// Represents a section (A, B, C, D …) within a Grade for a specific School.
/// Enables the School → Grade → Section three-level hierarchy.
/// All section-scoped modules (Students, Scheduler, Exams, Attendance,
/// Learning Path, Report Cards) reference this entity via SectionId.
/// </summary>
public class GradeSection : BaseEntity, IMultiTenant
{
    public Guid SchoolId    { get; set; }
    public Guid GradeId     { get; set; }

    /// <summary>Single-character or short code: A, B, C, D, E …</summary>
    public string SectionCode { get; set; } = null!;

    /// <summary>Optional human-readable label (e.g., "Blue Section").</summary>
    public string? SectionName { get; set; }

    public int Capacity { get; set; } = 0;

    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    // ── Navigation ────────────────────────────────────────────────────────────
    public School School { get; set; } = null!;
    public Grade  Grade  { get; set; } = null!;

    public ICollection<Student>   Students   { get; set; } = new List<Student>();
    public ICollection<Scheduler> Schedulers { get; set; } = new List<Scheduler>();
}
