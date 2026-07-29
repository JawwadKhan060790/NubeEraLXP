using System;
using NubeEra.Domain.Common;

namespace NubeEra.Domain.Entities;

/// <summary>
/// Immutable audit trail for every Backup &amp; Restore action performed in the
/// system (create, download, delete, restore — including failed/denied
/// attempts). Mirrors the shape of <see cref="EventAuditLog"/> but is scoped to
/// the system-level Backup &amp; Restore module rather than a single school, since
/// database backup/restore is a whole-system operation reserved for
/// Super Admin / System Admin.
/// </summary>
public class BackupAuditLog : BaseEntity
{
    /// <summary>Id of the user who performed (or attempted) the action.</summary>
    public Guid UserId { get; set; }

    /// <summary>Snapshot of the user's display name at the time of the action.</summary>
    public string UserName { get; set; } = null!;

    /// <summary>Snapshot of the user's role at the time of the action (e.g. "SuperAdmin").</summary>
    public string Role { get; set; } = null!;

    /// <summary>
    /// One of <see cref="Common.BackupConstants.ActionBackupCreated"/>,
    /// <see cref="Common.BackupConstants.ActionBackupDownloaded"/>,
    /// <see cref="Common.BackupConstants.ActionBackupDeleted"/>,
    /// <see cref="Common.BackupConstants.ActionRestoreStarted"/>,
    /// <see cref="Common.BackupConstants.ActionRestoreCompleted"/> or
    /// <see cref="Common.BackupConstants.ActionAccessDenied"/>.
    /// </summary>
    public string ActionType { get; set; } = null!;

    /// <summary>UTC timestamp of the action.</summary>
    public DateTime DateTime { get; set; } = DateTime.UtcNow;

    /// <summary>Caller IP address, resolved from the HTTP context (supports X-Forwarded-For).</summary>
    public string IpAddress { get; set; } = null!;

    /// <summary>
    /// One of <see cref="Common.BackupConstants.StatusSuccess"/> or
    /// <see cref="Common.BackupConstants.StatusFailed"/> — outcome of the action itself.
    /// </summary>
    public string Status { get; set; } = null!;

    /// <summary>Free-form details: file name, error message, row counts, etc.</summary>
    public string? Details { get; set; }
}
