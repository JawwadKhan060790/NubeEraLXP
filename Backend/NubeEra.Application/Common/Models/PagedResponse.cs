namespace NubeEra.Application.Common.Models;

/// <summary>
/// Standard paginated response envelope.
/// Returned by any endpoint that supports pagination.
/// </summary>
/// <typeparam name="T">Type of each item in the current page.</typeparam>
public class PagedResponse<T>
{
    /// <summary>Items on the current page.</summary>
    public IReadOnlyList<T> Items { get; init; } = Array.Empty<T>();

    /// <summary>Total number of records matching the query (all pages combined).</summary>
    public int TotalCount { get; init; }

    /// <summary>Total active count matching the filters.</summary>
    public int ActiveCount { get; init; }

    /// <summary>Total inactive count matching the filters.</summary>
    public int InactiveCount { get; init; }

    /// <summary>Total male count matching the filters.</summary>
    public int BoysCount { get; init; }

    /// <summary>Total female count matching the filters.</summary>
    public int GirlsCount { get; init; }

    /// <summary>Current page number (1-based).</summary>
    public int Page { get; init; }

    /// <summary>Maximum items per page.</summary>
    public int PageSize { get; init; }

    /// <summary>Total number of pages.</summary>
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;

    /// <summary>True when a next page exists.</summary>
    public bool HasNextPage => Page < TotalPages;

    /// <summary>True when a previous page exists.</summary>
    public bool HasPreviousPage => Page > 1;

    /// <summary>Convenience factory — builds a paged response from a pre-sliced item list.</summary>
    public static PagedResponse<T> Create(IReadOnlyList<T> items, int totalCount, PagedRequest request)
        => new()
        {
            Items = items,
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize
        };

    /// <summary>Empty page — no results found.</summary>
    public static PagedResponse<T> Empty(PagedRequest request)
        => Create(Array.Empty<T>(), 0, request);
}
