namespace NubeEra.Application.DTOs.RecycleBin;

/// <summary>A single soft-deleted record, normalised for the Recycle Bin UI.</summary>
public class RecycleBinItemDto
{
    public Guid     Id          { get; set; }
    /// <summary>Discriminator string used by the API to address this entity type (e.g. "School").</summary>
    public string   EntityType  { get; set; } = string.Empty;
    /// <summary>Human-readable entity name for display (e.g. "Mapplehill Academy", "John Smith").</summary>
    public string   DisplayName { get; set; } = string.Empty;
    public string?  Description { get; set; }
    public DateTime DeletedDate { get; set; }
    public Guid?    DeletedBy   { get; set; }
    public DateTime CreatedAt   { get; set; }
}

public class RecycleBinPageDto
{
    public List<RecycleBinItemDto> Items      { get; set; } = [];
    public int                     TotalCount { get; set; }
    public int                     Page       { get; set; }
    public int                     PageSize   { get; set; }
    public int                     TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;
}

/// <summary>Counts of soft-deleted records per entity type (for sidebar badges).</summary>
public class RecycleBinSummaryDto
{
    public Dictionary<string, int> Counts { get; set; } = [];
    public int                     Total  => Counts.Values.Sum();
}
