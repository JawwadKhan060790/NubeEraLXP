using System;
using System.Collections.Generic;

namespace NubeEra.Application.DTOs;

public class RestoreConfirmationDto
{
    public bool ConfirmRestore { get; set; }
}

public class BackupHistoryQueryDto
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string? Status { get; set; }
    public string? Search { get; set; }
}

public class BackupHistoryDto
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = null!;
    public string FilePath { get; set; } = null!;
    public long FileSizeBytes { get; set; }
    public string FileSizeFormatted { get; set; } = null!;
    public string DatabaseName { get; set; } = null!;
    public string Status { get; set; } = null!;
    public string? ErrorMessage { get; set; }
    public long DurationMs { get; set; }
    public Guid CreatedByUserId { get; set; }
    public string CreatedByUserName { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public bool IsFileDeleted { get; set; }
    public bool CanDownload { get; set; }
}

public class CreateBackupResultDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = null!;
    public BackupHistoryDto? Backup { get; set; }
}

public class RestoreBackupResultDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = null!;
    public long DurationMs { get; set; }
}

public class BackupModuleStatusDto
{
    public bool IsOperationRunning { get; set; }
    public string? CurrentOperation { get; set; }
    public DateTime? OperationStartedAt { get; set; }
}

public class BackupAuditLogDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = null!;
    public string Role { get; set; } = null!;
    public string ActionType { get; set; } = null!;
    public DateTime DateTime { get; set; }
    public string IpAddress { get; set; } = null!;
    public string Status { get; set; } = null!;
    public string? Details { get; set; }
}

public class PagedResultDto<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;
}
