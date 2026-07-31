using Veriton.Domain.Common;

namespace Veriton.Domain.Entities;

/// <summary>
/// Join entity granting a School visibility into a master <see cref="Unit"/>.
/// Unassigning a Unit from a School is modeled as a soft delete of this row
/// (IsDeleted = true) rather than a hard delete, preserving full assignment history.
/// Re-assigning a previously-unassigned (Unit, School) pair MUST restore the existing
/// soft-deleted row rather than insert a new one — the unique index on
/// (SchoolId, UnitId) depends on there being at most one row, ever, per pair.
/// See SchoolCurriculumAssignmentService for the assign/restore/unassign logic and
/// CurriculumAssignmentAuditLog for the parallel human-readable history trail.
/// </summary>
public class SchoolUnitAssignment : BaseEntity
{
    public Guid SchoolId { get; set; }
    public Guid UnitId { get; set; }

    /// <summary>Id of the Admin user who performed the (most recent) assignment.</summary>
    public Guid AssignedBy { get; set; }

    /// <summary>UTC timestamp of the (most recent) assignment.</summary>
    public DateTime AssignedDate { get; set; }

    /// <summary>Optional free-text reason/comment captured at assignment time.</summary>
    public string? Notes { get; set; }

    // Navigation properties
    public School School { get; set; } = null!;
    public Module Unit { get; set; } = null!;
}
