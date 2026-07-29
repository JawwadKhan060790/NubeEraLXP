using NubeEra.Application.Common.Models;
using NubeEra.Application.DTOs;

namespace NubeEra.Application.Interfaces.Services;

/// <summary>
/// Implements Requirement 1 (School-Based Curriculum Assignment), the assignment
/// half of Requirement 4 (school-level visibility — the EF Core global query
/// filters already enforce the read side, this service owns the write side that
/// populates the join tables those filters key off of), and Requirement 7.1/7.3
/// (Admin Curriculum Assignment screen + School Curriculum Dashboard).
///
/// Business rules enforced here (not at the DB layer):
/// - A Topic can only be assigned to a School once that School already has the
///   Topic's parent Unit assigned.
/// - Unassigning a Unit from a School cascades: every Topic of that Unit currently
///   assigned to the same School is unassigned too (a School should never retain a
///   Topic whose parent Unit it no longer has).
/// - Re-assigning a previously-unassigned (School, Unit) or (School, Topic) pair
///   restores the existing soft-deleted join row rather than inserting a duplicate
///   (required by the unique index on (SchoolId, UnitId) / (SchoolId, TopicId)).
/// - Every assign/unassign/restore writes one <see cref="CurriculumAssignmentAuditLogDto"/> row.
///
/// All methods here are intended to be called only from Admin/Staff-restricted
/// controller actions (<c>AppPolicies.StaffOnly</c>); this service does not
/// re-check role itself.
/// </summary>
public interface ISchoolCurriculumAssignmentService
{
    // ── Catalog / assignment views (Admin Curriculum Assignment screen) ────────

    /// <summary>
    /// Combined Unit+Topic master catalog with an assigned/unassigned flag for one
    /// School in context. Backs the Admin assignment grid (search, filter by
    /// Unit/EntityType/AssignedOnly, paged).
    /// </summary>
    Task<PagedResponse<SchoolCurriculumCatalogItemDto>> GetCatalogAsync(SchoolCurriculumCatalogQueryDto query);

    Task<List<SchoolUnitAssignmentDto>> GetSchoolUnitAssignmentsAsync(Guid schoolId);

    Task<List<SchoolTopicAssignmentDto>> GetSchoolTopicAssignmentsAsync(Guid schoolId);

    /// <summary>Per-School curriculum dashboard summary (Requirement 7.3).</summary>
    Task<SchoolCurriculumDashboardDto> GetDashboardAsync(Guid schoolId);

    /// <summary>Assignment history / audit trail, optionally filtered by School/EntityType/EntityId/date range.</summary>
    Task<PagedResponse<CurriculumAssignmentAuditLogDto>> GetAuditLogAsync(CurriculumAssignmentAuditLogQueryDto query);

    // ── Assign / Unassign (bulk-capable; each item is independently validated) ─

    Task<BulkCurriculumAssignmentResultDto> AssignUnitsToSchoolAsync(AssignUnitsToSchoolDto dto);

    Task<BulkCurriculumAssignmentResultDto> AssignTopicsToSchoolAsync(AssignTopicsToSchoolDto dto);

    Task<BulkCurriculumAssignmentResultDto> UnassignUnitsFromSchoolAsync(UnassignUnitsFromSchoolDto dto);

    Task<BulkCurriculumAssignmentResultDto> UnassignTopicsFromSchoolAsync(UnassignTopicsFromSchoolDto dto);
}
