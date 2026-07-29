using NubeEra.Domain.Common;

namespace NubeEra.Domain.Entities;

/// <summary>
/// Join entity granting a School visibility into a master <see cref="Topic"/>.
/// Mirrors <see cref="SchoolUnitAssignment"/> exactly (soft-delete = unassign,
/// restore-on-reassign). The service layer enforces that a School can only be
/// assigned a Topic once it already has the Topic's parent Unit assigned.
/// </summary>
public class SchoolTopicAssignment : BaseEntity
{
    public Guid SchoolId { get; set; }
    public Guid TopicId { get; set; }

    /// <summary>Id of the Admin user who performed the (most recent) assignment.</summary>
    public Guid AssignedBy { get; set; }

    /// <summary>UTC timestamp of the (most recent) assignment.</summary>
    public DateTime AssignedDate { get; set; }

    /// <summary>Optional free-text reason/comment captured at assignment time.</summary>
    public string? Notes { get; set; }

    // Navigation properties
    public School School { get; set; } = null!;
    public Lesson Topic { get; set; } = null!;
}
