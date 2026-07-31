using Veriton.Application.DTOs;

namespace Veriton.Application.Interfaces.Services;

/// <summary>
/// Centralized, application-wide single source of truth for "which grades may this user
/// see / act upon right now". Every module (Students, Parents, Teachers, Attendance,
/// Exams, Assignments, Homework, Timetable, Learning Content, Events, Reports,
/// Notifications, STEM Activities, Competitions, Certificates, Analytics, Dashboards,
/// dropdowns, filters, search/registration forms, ...) MUST resolve grade visibility
/// through this service rather than re-implementing its own filtering logic.
///
/// Responsibilities:
///   1. Expose the standardized 1st-10th Grade master list (system-defined data).
///   2. Resolve the subset of that list visible to a given school / the current user,
///      based on the school's configured FromGrade-ToGrade range.
///   3. Provide hard enforcement (throwing GradeAccessForbiddenException) so that even
///      a manually crafted API request supplying an out-of-range GradeId/grade level is
///      rejected with 403 — never silently returns out-of-range data.
/// </summary>
public interface IGradeAccessService
{
    /// <summary>The full standardized master list (1st-10th Grade), unfiltered. Used by
    /// platform-level screens (e.g. SuperAdmin academic setup, School create/edit form).</summary>
    Task<List<GradeLevelDto>> GetAllGradeLevelsAsync();

    /// <summary>Grade levels visible for a specific school (its configured From-To range).
    /// Pass null for platform-wide/unscoped contexts (returns the full master list).</summary>
    Task<List<GradeLevelDto>> GetAllowedGradeLevelsAsync(Guid? schoolId);

    /// <summary>Grade levels visible to the CURRENT authenticated user — resolves the
    /// user's school from ICurrentUserService and applies that school's configured range.
    /// This is what every dropdown/filter/selector in the app should call.</summary>
    Task<List<GradeLevelDto>> GetAllowedGradeLevelsForCurrentUserAsync();

    /// <summary>True if the numeric grade level (1-10) is within the given school's
    /// configured range. A null schoolId is treated as platform-wide (always true for 1-10).</summary>
    Task<bool> IsLevelNumberAllowedAsync(Guid? schoolId, int levelNumber);

    /// <summary>Throws <see cref="Veriton.Domain.Common.GradeAccessForbiddenException"/> (-> HTTP 403)
    /// if the numeric grade level is outside the given school's configured range.</summary>
    Task EnsureLevelNumberAllowedAsync(Guid? schoolId, int levelNumber);

    /// <summary>
    /// Hard security check for any endpoint that receives a GradeId (class/section) from
    /// the client. Verifies that: (a) the grade's level falls within ITS OWN school's
    /// configured range, and (b) if the current user is school-scoped, the grade belongs
    /// to that same school. Throws GradeAccessForbiddenException (403) otherwise.
    /// This is what stops "manipulate the API request to read another grade's data".
    /// </summary>
    Task EnsureGradeAccessibleToCurrentUserAsync(Guid gradeId);
}
