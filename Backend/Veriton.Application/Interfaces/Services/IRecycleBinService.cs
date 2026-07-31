using Veriton.Application.DTOs.RecycleBin;

namespace Veriton.Application.Interfaces.Services;

/// <summary>
/// Recycle Bin operations for soft-deleted entities.
/// Access is role-gated at the controller level:
///   Admin     → view + restore
///   SuperAdmin → view + restore + permanent delete
/// </summary>
public interface IRecycleBinService
{
    /// <summary>Supported entity type discriminators (keys for GetDeletedItemsAsync).</summary>
    IReadOnlyList<string> SupportedEntityTypes { get; }

    /// <summary>Paginated list of soft-deleted records for a given entity type.</summary>
    Task<RecycleBinPageDto> GetDeletedItemsAsync(string entityType, int page = 1, int pageSize = 20);

    /// <summary>Count of soft-deleted records per entity type (for UI badges).</summary>
    Task<RecycleBinSummaryDto> GetSummaryAsync();

    /// <summary>Clears IsDeleted on a record, making it visible again.</summary>
    Task RestoreAsync(string entityType, Guid id, Guid restoredByUserId);

    /// <summary>Hard-deletes a record from the database. SuperAdmin only.</summary>
    Task PermanentDeleteAsync(string entityType, Guid id);
}
