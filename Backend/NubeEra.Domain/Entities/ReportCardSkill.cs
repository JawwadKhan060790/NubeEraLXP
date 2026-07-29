using NubeEra.Domain.Common;

namespace NubeEra.Domain.Entities;

/// <summary>Skill evaluation row (1-5 rating) within a report card.</summary>
public class ReportCardSkill : BaseEntity
{
    public Guid ReportCardId { get; set; }
    public string SkillName { get; set; } = null!;  // Communication, Teamwork, Creativity, Problem Solving, Critical Thinking, Behaviour
    public int Rating { get; set; }                 // 1-5
    public string? Remarks { get; set; }
    public int SortOrder { get; set; } = 0;

    public ReportCard ReportCard { get; set; } = null!;
}
