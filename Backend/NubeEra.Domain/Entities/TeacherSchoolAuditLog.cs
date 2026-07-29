using NubeEra.Domain.Common;

namespace NubeEra.Domain.Entities;

/// <summary>
/// Append-only history trail for Multi-School Teacher Assignment (Requirement 2/7).
/// One row per assign/unassign/activate/deactivate action against a TeacherSchool row.
/// Denormalized-snapshot pattern, same rationale as <see cref="CurriculumAssignmentAuditLog"/>.
/// </summary>
public class TeacherSchoolAuditLog : BaseEntity
{
    public Guid TeacherId { get; set; }
    public Guid SchoolId { get; set; }

    /// <summary>Denormalized snapshot of the Teacher's full name at the time of the action.</summary>
    public string TeacherName { get; set; } = null!;

    /// <summary>Denormalized snapshot of the School's name at the time of the action.</summary>
    public string SchoolName { get; set; } = null!;

    /// <summary>"Assigned", "Unassigned", "Activated", "Deactivated", "Restored".</summary>
    public string ActionPerformed { get; set; } = null!;

    public Guid PerformedBy { get; set; }

    /// <summary>Denormalized display name of the acting user.</summary>
    public string UserName { get; set; } = null!;

    /// <summary>Denormalized role of the acting user.</summary>
    public string Role { get; set; } = null!;

    public DateTime DateTime { get; set; } = DateTime.UtcNow;

    public string? Notes { get; set; }

    // Navigation properties
    public Teacher Teacher { get; set; } = null!;
    public School School { get; set; } = null!;
}
