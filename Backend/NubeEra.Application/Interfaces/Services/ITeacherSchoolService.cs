using NubeEra.Application.Common.Models;
using NubeEra.Application.DTOs;

namespace NubeEra.Application.Interfaces.Services;

/// <summary>
/// Implements Requirement 2 (Multi-School Teacher Assignment), Requirement 3
/// (school-specific Teacher access / post-login school switching) and
/// Requirement 7.2 (Admin Teacher-School Assignment screen).
///
/// Business rules enforced here (not at the DB layer):
/// - A Teacher may belong to multiple Schools via <c>TeacherSchool</c> join rows.
/// - Exactly one TeacherSchool row per Teacher has <c>IsPrimary = true</c>, kept in
///   sync with <c>Teacher.SchoolId</c> (and, transitively, <c>User.SchoolId</c> —
///   the claim the JWT embeds) — the legacy single-school fields used for token
///   issuance and any not-yet-migrated reporting code.
/// - Re-assigning a previously-removed (Teacher, School) pair restores the
///   existing soft-deleted join row rather than inserting a duplicate (required
///   by the unique index on (TeacherId, SchoolId)).
/// - <c>IsActive</c> (business status) is independent of soft delete: deactivating
///   a Teacher's access to a School keeps the historical row; removing it soft-deletes.
/// - A Teacher's primary School can never be removed or deactivated directly, and a
///   Teacher's last remaining (active, non-deleted) School can never be removed —
///   callers must set a new primary / add another School first.
/// - Every assign/unassign/activate/deactivate/restore/primary-change writes one
///   <see cref="TeacherSchoolAuditLogDto"/> row.
///
/// All methods here are intended to be called only from Admin/Staff-restricted
/// controller actions (<c>AppPolicies.StaffOnly</c>) UNLESS noted otherwise; this
/// service does not re-check role itself. <see cref="GetAvailableSchoolsForLoginAsync"/>
/// is the one read meant to be called by the Teacher themselves post-login — the EF
/// Core global query filter on <c>TeacherSchool</c> already scopes a Teacher caller
/// to their own rows regardless of the <c>teacherId</c> argument, so it is safe either way.
/// </summary>
public interface ITeacherSchoolService
{
    /// <summary>All (active + inactive, non-deleted) School memberships for one Teacher — backs the Teacher Edit screen's multi-select.</summary>
    Task<List<TeacherSchoolDto>> GetByTeacherAsync(Guid teacherId);

    /// <summary>Active memberships only, lightweight projection — backs the post-login school-switcher (Requirement 3).</summary>
    Task<List<TeacherAvailableSchoolDto>> GetAvailableSchoolsForLoginAsync(Guid teacherId);

    /// <summary>Paged/filterable grid for the Admin Teacher-School Assignment screen.</summary>
    Task<PagedResponse<TeacherSchoolDto>> GetPagedAsync(TeacherSchoolQueryDto query);

    /// <summary>Assignment history / audit trail, optionally filtered by Teacher/School/date range.</summary>
    Task<PagedResponse<TeacherSchoolAuditLogDto>> GetAuditLogAsync(TeacherSchoolAuditLogQueryDto query);

    /// <summary>
    /// Full-set sync used by the Teacher Create/Edit screen: adds new memberships,
    /// restores previously soft-deleted ones, and updates the primary school —
    /// never removes a membership that is simply absent from the list (see
    /// <see cref="TeacherSchoolAssignmentSetDto"/> for the rationale). Safe to call
    /// even when the Teacher has zero prior memberships (e.g. right after creation).
    /// </summary>
    Task SyncTeacherSchoolsAsync(TeacherSchoolAssignmentSetDto dto);

    /// <summary>Bulk-assigns (or restores) one or more additional Schools to a Teacher. Used by the standalone Teacher-School Assignment screen.</summary>
    Task<TeacherSchoolBulkResultDto> AssignToSchoolsAsync(AssignTeacherToSchoolsDto dto);

    /// <summary>Soft-deletes a single Teacher-School membership.</summary>
    Task RemoveAsync(RemoveTeacherSchoolDto dto);

    /// <summary>Toggles a membership's Active/Inactive business status.</summary>
    Task SetStatusAsync(Guid teacherId, Guid schoolId, UpdateTeacherSchoolStatusDto dto);

    /// <summary>Marks one of a Teacher's Schools as primary/home; mirrors the change onto Teacher.SchoolId and User.SchoolId.</summary>
    Task SetPrimaryAsync(SetPrimaryTeacherSchoolDto dto);

    /// <summary>
    /// Soft-deletes every TeacherSchool membership for a Teacher. Called by
    /// TeacherService when a Teacher is deleted, so no orphaned "active" school
    /// memberships are left behind for a Teacher that no longer exists.
    /// </summary>
    Task RemoveAllForTeacherAsync(Guid teacherId, string? reason = null);
}
