using Microsoft.EntityFrameworkCore;
using Veriton.Application.Common.Models;
using Veriton.Application.Interfaces.Repositories;
using Veriton.Domain.Common;
using Veriton.Infrastructure.Persistence.DbContext;

namespace Veriton.Infrastructure.Repositories;

/// <summary>
/// Generic repository with offset-based pagination.
/// Inherits all CRUD from <see cref="GenericRepository{T}"/> and adds
/// <see cref="GetPagedAsync"/> for list endpoints that must not return every row.
/// </summary>
public class PagedRepository<T> : GenericRepository<T>, IPagedRepository<T>
    where T : BaseEntity
{
    public PagedRepository(AppDbContext context) : base(context) { }

    /// <inheritdoc/>
    public async Task<(List<T> Items, int TotalCount)> GetPagedAsync(
        PagedRequest request,
        Func<IQueryable<T>, IQueryable<T>>? filter = null,
        Func<IQueryable<T>, IQueryable<T>>? include = null)
    {
        IQueryable<T> query = _dbSet.AsNoTracking();

        // Apply caller-supplied WHERE predicate (search, tenant, etc.)
        if (filter is not null)
            query = filter(query);

        // Count BEFORE slicing (no ORDER BY in the count query)
        var totalCount = await query.CountAsync();

        // Navigation-property includes
        if (include is not null)
            query = include(query);

        // Dynamic ordering via SortBy + SortDirection
        if (!string.IsNullOrWhiteSpace(request.SortBy))
        {
            // Reflect the column name onto the entity type; fall back to Id if not found.
            var property = typeof(T).GetProperty(
                request.SortBy,
                System.Reflection.BindingFlags.IgnoreCase |
                System.Reflection.BindingFlags.Public |
                System.Reflection.BindingFlags.Instance);

            if (property is not null)
            {
                query = request.IsDescending
                    ? query.OrderByDescending(e => EF.Property<object>(e, property.Name))
                    : query.OrderBy(e => EF.Property<object>(e, property.Name));
            }
            else
            {
                // Unknown column — safe fallback to CreatedAt descending
                query = query.OrderByDescending(e => EF.Property<DateTime>(e, nameof(BaseEntity.CreatedAt)));
            }
        }
        else
        {
            // Default: newest-first
            query = query.OrderByDescending(e => EF.Property<DateTime>(e, nameof(BaseEntity.CreatedAt)));
        }

        var items = await query
            .Skip(request.Skip)
            .Take(request.PageSize)
            .ToListAsync();

        return (items, totalCount);
    }
}
