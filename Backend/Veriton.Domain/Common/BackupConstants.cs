namespace Veriton.Domain.Common;

/// <summary>
/// Shared string constants for the Database Backup &amp; Restore module
/// (statuses + audit action types). Centralised here — rather than duplicated as
/// magic strings across Application/Infrastructure/API — so the grid, filters,
/// and audit log all agree on the exact same vocabulary.
/// </summary>
public static class BackupConstants
{
    // Backup / restore run statuses ------------------------------------------------
    public const string StatusSuccess = "Success";
    public const string StatusFailed = "Failed";
    public const string StatusInProgress = "InProgress";

    // Audit action types ------------------------------------------------------------
    public const string ActionBackupStarted = "BackupStarted";
    public const string ActionBackupCreated = "BackupCreated";
    public const string ActionBackupDownloaded = "BackupDownloaded";
    public const string ActionBackupDeleted = "BackupDeleted";
    public const string ActionRestoreStarted = "RestoreStarted";
    public const string ActionRestoreCompleted = "RestoreCompleted";
    public const string ActionAccessDenied = "AccessDenied";

    /// <summary>Maximum allowed upload size for a restore (.sql) file, in bytes — 500 MB.</summary>
    public const long MaxRestoreFileSizeBytes = 500L * 1024 * 1024;

    /// <summary>Only this extension is accepted for restore uploads.</summary>
    public const string AllowedRestoreExtension = ".sql";
}
