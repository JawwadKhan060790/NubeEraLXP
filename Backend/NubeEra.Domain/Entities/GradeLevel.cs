using NubeEra.Domain.Common;

namespace NubeEra.Domain.Entities;

/// <summary>
/// System-defined master data representing the standardized global grade levels
/// supported across the entire application (1st Grade .. 10th Grade).
///
/// This is the SINGLE SOURCE OF TRUTH for which grade levels exist in the system.
/// It is seeded once with exactly 10 rows (LevelNumber 1-10) and is not intended
/// to be created/edited/deleted through normal application workflows — schools
/// merely select a sub-range of this master list via School.FromGradeId/ToGradeId.
/// </summary>
public class GradeLevel : BaseEntity
{
    /// <summary>Numeric grade level, 1-10. Used for range comparisons and ordering.</summary>
    public int LevelNumber { get; set; }

    /// <summary>Display name, e.g. "1st Grade", "2nd Grade" ... "10th Grade".</summary>
    public string Name { get; set; } = null!;

    /// <summary>Sort/display order (mirrors LevelNumber but kept explicit for flexibility).</summary>
    public int DisplayOrder { get; set; }

    /// <summary>System-defined master data is always active; flag retained for consistency with other masters and for soft-deactivation if ever required.</summary>
    public bool IsActive { get; set; } = true;

    // Navigation properties: schools that use this level as their lower/upper bound.
    public ICollection<School> SchoolsWithFromGrade { get; set; } = new List<School>();
    public ICollection<School> SchoolsWithToGrade { get; set; } = new List<School>();

    // School-grade mappings (Grade rows) that reference this master level.
    public ICollection<Grade> Grades { get; set; } = new List<Grade>();

    // Master Units (Modules) written at this grade level, shared across all schools.
    public ICollection<Module> Modules { get; set; } = new List<Module>();
    public ICollection<Subject> Subjects { get; set; } = new List<Subject>();

}
