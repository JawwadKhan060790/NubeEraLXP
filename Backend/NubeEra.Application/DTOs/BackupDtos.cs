using System;
using System.Collections.Generic;

namespace NubeEra.Application.DTOs;

// ============================================================================
// DATABASE BACKUP & RESTORE — DTOs
// ============================================================================

/// <summary>
/// Row shown in the "Backup History" grid (Backup Name, Backup Date, File Size,
/// Created By, Status, Download/Delete actions).
/// </summary>
public class BackupHistoryDto
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = "";
    public string DatabaseName { get; set; } = "";
    public long FileSizeBytes { get; set; }

    /// <summary>Human-readable size, e.g. "12.4 MB" — pre-formatted server-side so every client renders identically.</summary>
    public string FileSizeDisplay { get; set; } = "";

    public DateTime CreatedAt { get; set; }
    public string CreatedByUserName { get; set; } = "";
    public string Status { get; set; } = "";
    public string? ErrorMessage { get; set; }
    public long DurationMs { get; set; }
    public bool IsFileDeleted { get; set; }

    /// <summary>True when the dump file still exists on disk and can be downloaded.</summary>
    public bool CanDownload { get; set; }
}

/// <summary>Response returned immediately after triggering "Create Backup".</summary>
public class CreateBackupResultDto
{
    public Guid BackupId { get; set; }
    public string FileName { get; set; } = "";
    public string Status { get; set; } = "";
    public long FileSizeBytes { get; set; }
    public string FileSizeDisplay { get; set; } = "";
    public long DurationMs { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Result returned after a restore attempt completes (success or failure).
/// </summary>
public class RestoreBackupResultDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = "";
    public string? FileName { get; set; }
    public long DurationMs { get; set; }
    public DateTime CompletedAt { get; set; }
}

/// <summary>
/// Server-side guard that mirrors the UI confirmation dialog.
/// </summary>
public class RestoreConfirmationDto
{
    /// <summary>Must be <c>true</c>; set after the user accepts the overwrite warning.</summary>
    public bool ConfirmRestore { get; set; }
}

/// <summary>Snapshot of current backup/restore activity — used to disable buttons and show progress in the UI.</summary>
public class BackupModuleStatusDto
{
    public bool IsBackupInProgress { get; set; }
    public bool IsRestoreInProgress { get; set; }
    public string DatabaseName { get; set; } = "";
}

/// <summary>Row shown when listing the module's audit trail (optional admin drill-down).</summary>
public class BackupAuditLogDto
{
    public Guid Id { get; set; }
    public string UserName { get; set; } = "";
    public string Role { get; set; } = "";
    public string ActionType { get; set; } = "";
    public DateTime DateTime { get; set; }
    public string IpAddress { get; set; } = "";
    public string Status { get; set; } = "";
    public string? Details { get; set; }
}

/// <summary>Generic paged envelope for the history/audit grids (search + filter + pagination).</summary>
public class PagedResultDto<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

/// <summary>Query parameters accepted by GET /api/backups (search, status filter, pagination).</summary>
public class BackupHistoryQueryDto
{
    public string? Search { get; set; }
    public string? Status { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}
