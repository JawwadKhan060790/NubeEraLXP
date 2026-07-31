namespace Veriton.Application.DTOs;

// ── GradeSection DTOs ─────────────────────────────────────────────────────────

public class GradeSectionCreateDto
{
    public Guid   SchoolId    { get; set; }
    public Guid   GradeId     { get; set; }
    public string SectionCode { get; set; } = null!;   // A, B, C, D …
    public string? SectionName { get; set; }
    public int    Capacity    { get; set; } = 0;
    public string? Description { get; set; }
}

public class GradeSectionUpdateDto
{
    public string SectionCode { get; set; } = null!;
    public string? SectionName { get; set; }
    public int    Capacity    { get; set; }
    public string? Description { get; set; }
    public bool   IsActive    { get; set; }
}

public class GradeSectionDto
{
    public Guid   Id           { get; set; }
    public Guid   SchoolId     { get; set; }
    public string SchoolName   { get; set; } = null!;
    public Guid   GradeId      { get; set; }
    public string GradeName    { get; set; } = null!;
    public string GradeLevel   { get; set; } = null!;
    public string SectionCode  { get; set; } = null!;
    public string? SectionName { get; set; }
    public int    Capacity     { get; set; }
    public string? Description { get; set; }
    public bool   IsActive     { get; set; }
    public int    StudentCount { get; set; }

    /// <summary>Composite display label: "Grade 1 - A"</summary>
    public string DisplayName => $"{GradeName} - {SectionCode}";
}
