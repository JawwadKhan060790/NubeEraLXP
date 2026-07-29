using NubeEra.Domain.Common;

namespace NubeEra.Domain.Entities;

/// <summary>
/// Append-only history trail for School-Based Curriculum Assignment (Requirement 1/7).
/// One row per assign/unassign/bulk-assign/bulk-remove action against a
/// SchoolUnitAssignment or SchoolTopicAssignment. Uses the same denormalized-snapshot
/// pattern as <see cref="EventAuditLog"/> / <see cref="BackupAuditLog"/> (UserName/Role
/// captured as plain strings) so the assignment-history UI never needs an extra join
/// to render a readable timeline, and the row remains meaningful even if the acting
/// user is later deleted.
/// </summary>
public class CurriculumAssignmentAuditLog : BaseEntity
{
    public Guid SchoolId { get; set; }

    /// <summary>"Unit" or "Topic" — which master entity this log entry concerns.</summary>
    public string EntityType { get; set; } = null!;

    /// <summary>Id of the Unit or Topic referenced by EntityType.</summary>
    public Guid EntityId { get; set; }

    /// <summary>Denormalized name snapshot of the Unit/Topic at the time of the action.</summary>
    public string EntityName { get; set; } = null!;

    /// <summary>"Assigned", "Unassigned", "BulkAssigned", "BulkRemoved", "Restored".</summary>
    public string ActionPerformed { get; set; } = null!;

    public Guid PerformedBy { get; set; }

    /// <summary>Denormalized display name of the acting user.</summary>
    public string UserName { get; set; } = null!;

    /// <summary>Denormalized role of the acting user.</summary>
    public string Role { get; set; } = null!;

    public DateTime DateTime { get; set; } = DateTime.UtcNow;

    public string? Notes { get; set; }

    // Navigation properties
    public School School { get; set; } = null!;
}
