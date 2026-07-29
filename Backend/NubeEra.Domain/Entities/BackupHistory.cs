using System;
using NubeEra.Domain.Common;

namespace NubeEra.Domain.Entities;

/// <summary>
/// Represents a single database backup (dump) operation and its outcome.
/// One row is written per "Create Backup" attempt — including failed attempts —
/// so the Backup History grid can show a complete, auditable trail.
/// </summary>
public class BackupHistory : BaseEntity
{
    /// <summary>
    /// Generated dump file name, e.g. "nubeera_db_20260608_143000.sql".
    /// </summary>
    public string FileName { get; set; } = null!;

    /// <summary>
    /// Absolute server-side path where the dump file is stored
    /// (used to stream the file back on download / to remove it on delete).
    /// </summary>
    public string FilePath { get; set; } = null!;

    /// <summary>
    /// Size of the generated dump file, in bytes. Zero/0 when the backup failed
    /// before a file could be produced.
    /// </summary>
    public long FileSizeBytes { get; set; }

    /// <summary>
    /// Name of the database that was backed up (captured at run time so the
    /// history remains meaningful even if the connection string changes later).
    /// </summary>
    public string DatabaseName { get; set; } = null!;

    /// <summary>
    /// One of <see cref="Common.BackupConstants.StatusSuccess"/>,
    /// <see cref="Common.BackupConstants.StatusFailed"/> or
    /// <see cref="Common.BackupConstants.StatusInProgress"/>.
    /// </summary>
    public string Status { get; set; } = null!;

    /// <summary>
    /// Failure details (mysqldump stderr / exception message) — null on success.
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// How long the dump took to generate, in milliseconds — useful for
    /// diagnosing slow backups on large databases.
    /// </summary>
    public long DurationMs { get; set; }

    /// <summary>
    /// User who triggered the backup.
    /// </summary>
    public Guid CreatedByUserId { get; set; }

    /// <summary>
    /// Snapshot of the triggering user's display name (kept even if the user
    /// account is later removed).
    /// </summary>
    public string CreatedByUserName { get; set; } = null!;

    /// <summary>
    /// True once the underlying file has been removed from disk (soft marker —
    /// the history row is preserved for audit purposes even after deletion).
    /// </summary>
    public bool IsFileDeleted { get; set; }
}
