using NubeEra.Domain.Common;

namespace NubeEra.Domain.Entities;

/// <summary>
/// School-configurable grading rule. Maps a percentage range to a grade letter + GPA.
/// Default rules are seeded by the system; schools can override per-school.
/// </summary>
public class ReportCardGradingRule : BaseEntity
{
    public Guid? SchoolId { get; set; }   // null = system-wide default
    public decimal MinPercentage { get; set; }
    public decimal MaxPercentage { get; set; }
    public string GradeLetter { get; set; } = null!;  // A+, A, B+, B, C, F
    public decimal? GpaValue { get; set; }
    public string? Description { get; set; }  // "Outstanding", "Excellent", …
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; } = 0;

    public School? School { get; set; }
}
