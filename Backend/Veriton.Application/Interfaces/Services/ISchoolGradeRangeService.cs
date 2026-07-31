namespace Veriton.Application.Interfaces.Services;

/// <summary>
/// Inclusive numeric grade-level range, e.g. (From: 6, To: 10) means the school
/// supports Grades 6, 7, 8, 9 and 10 only.
/// </summary>
public record GradeRange(int From, int To);

/// <summary>
/// Single source of truth for resolving a school's configured grade range
/// (School.FromGradeId/ToGradeId -> numeric LevelNumber bounds).
///
/// Performance: results are cached (school grade ranges change rarely — only when a
/// Principal/Admin edits School Academic Setup) so that the hot path of every grade
/// dropdown/filter/report avoids a repeated join to schools+grade_levels.
/// Call <see cref="InvalidateCache"/> whenever a school's FromGrade/ToGrade is updated.
/// </summary>
public interface ISchoolGradeRangeService
{
    /// <summary>
    /// Resolves the inclusive grade range configured for the given school.
    /// Returns null if the school does not exist or has not yet configured a valid range
    /// (callers should treat "no range configured" as "no grades visible" — fail closed).
    /// </summary>
    Task<GradeRange?> GetRangeAsync(Guid schoolId);

    /// <summary>Removes the cached range for a school. Call after any School update.</summary>
    void InvalidateCache(Guid schoolId);
}
