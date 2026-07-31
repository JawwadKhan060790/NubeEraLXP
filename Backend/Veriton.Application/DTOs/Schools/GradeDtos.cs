namespace Veriton.Application.DTOs;

public class GradeCreateDto
{
    public Guid? SchoolId { get; set; }

    // Preferred going forward: the master grade_levels.Id. When supplied, this is
    // authoritative and GradeLevel/GradeName are derived from it server-side.
    public Guid? GradeLevelId { get; set; }

    // Legacy/back-compat path: a level-number string ("1".."10", optionally
    // "1st".."10th"). Still accepted when GradeLevelId is omitted so existing
    // API clients keep working unchanged. At least one of the two must be supplied
    // (enforced in GradeCreateValidator).
    public string? GradeLevel { get; set; }
    public string? GradeName { get; set; }
    public int? Capacity { get; set; }
    public Guid? ClassTeacherId { get; set; }
    public string? ClassRoom { get; set; }
    public string? AcademicYear { get; set; }
}

public class GradeUpdateDto : GradeCreateDto
{
    public bool IsActive { get; set; }
}

public class GradeDto
{
    public Guid Id { get; set; }
    public Guid? SchoolId { get; set; }
    public string SchoolName { get; set; } = null!;
    public Guid? GradeLevelId { get; set; }
    public string GradeLevel { get; set; } = null!;
    public string GradeName { get; set; } = null!;
    public int Capacity { get; set; }
    public Guid? ClassTeacherId { get; set; }
    public string? ClassTeacherName { get; set; }
    public string? ClassRoom { get; set; }
    public string? AcademicYear { get; set; }
    public bool IsActive { get; set; }
    public int StudentCount { get; set; }
}