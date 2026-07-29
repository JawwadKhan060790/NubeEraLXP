using NubeEra.Domain.Common;

namespace NubeEra.Domain.Entities;

/// <summary>Subject-level marks row within a report card.</summary>
public class ReportCardSubject : BaseEntity
{
    public Guid ReportCardId { get; set; }
    public string SubjectName { get; set; } = null!;
    public int MaxMarks { get; set; }
    public decimal ObtainedMarks { get; set; }
    public string? Grade { get; set; }     // Per-subject grade letter
    public string? Remarks { get; set; }
    public int SortOrder { get; set; } = 0;

    public ReportCard ReportCard { get; set; } = null!;
}
