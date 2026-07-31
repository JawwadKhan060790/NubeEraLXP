namespace Veriton.Domain.Common;

/// <summary>
/// Marks an entity as soft-deletable.
/// When <see cref="IsDeleted"/> is true, EF Core global query filters exclude the record
/// from all regular queries. Use IgnoreQueryFilters() to bypass for Recycle Bin access.
/// </summary>
public interface ISoftDelete
{
    bool      IsDeleted   { get; set; }
    DateTime? DeletedDate { get; set; }
    Guid?     DeletedBy   { get; set; }
}
