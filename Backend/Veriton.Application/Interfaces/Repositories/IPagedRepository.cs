using Veriton.Application.Common.Models;
using Veriton.Domain.Common;

namespace Veriton.Application.Interfaces.Repositories;

/// <summary>
/// Extends <see cref="IGenericRepository{T}"/> with standard offset-based pagination.
/// Implement once in <c>PagedRepository&lt;T&gt;</c>; inject wherever a list endpoint
/// needs pagination instead of dumping every row.
/// </summary>
public interface IPagedRepository<T> : IGenericRepository<T> where T : BaseEntity
{
    /// <summary>
    /// Returns a single page of results together with the total count for metadata.
    /// </summary>
    /// <param name="request">Page/size/search/sort parameters.</param>
    /// <param name="filter">Optional additional WHERE predicate applied before counting and slicing.</param>
    /// <param name="include">Optional navigation-property includes.</param>
    Task<(List<T> Items, int TotalCount)> GetPagedAsync(
        PagedRequest request,
        Func<IQueryable<T>, IQueryable<T>>? filter = null,
        Func<IQueryable<T>, IQueryable<T>>? include = null);
}
