using NubeEra.Domain.Common;

namespace NubeEra.Domain.Entities;

/// <summary>Co-curricular / extra-curricular activity row within a report card.</summary>
public class ReportCardActivity : BaseEntity
{
    public Guid ReportCardId { get; set; }
    public string ActivityName { get; set; } = null!;  // Sports, Robotics, Coding, STEM, Leadership, Discipline
    public string? Rating { get; set; }                // Excellent | Good | Satisfactory | Needs Improvement
    public string? Remarks { get; set; }
    public int SortOrder { get; set; } = 0;

    public ReportCard ReportCard { get; set; } = null!;
}
