namespace Veriton.Application.DTOs;

/// <summary>
/// Read-only representation of a system-defined grade level (1st Grade .. 10th Grade).
/// This is the canonical shape returned by every grade dropdown/filter/selector in the
/// application — sourced exclusively from the centralized GradeAccessService so that
/// every module renders an identical, school-scoped list.
/// </summary>
public class GradeLevelDto
{
    public Guid Id { get; set; }
    public int LevelNumber { get; set; }
    public string Name { get; set; } = null!;
    public int DisplayOrder { get; set; }
}

/// <summary>
/// Lightweight value describing an inclusive numeric grade range (e.g. From=6, To=10).
/// </summary>
public class GradeRangeDto
{
    public int FromGrade { get; set; }
    public int ToGrade { get; set; }
}
