namespace Veriton.Application.Common.Models;

/// <summary>
/// Standard pagination request. Use as a query-string or body parameter.
/// </summary>
public class PagedRequest
{
    private int _page = 1;
    private int _pageSize = 20;

    /// <summary>1-based page number. Defaults to 1.</summary>
    public int Page
    {
        get => _page;
        set => _page = value < 1 ? 1 : value;
    }

    /// <summary>Number of items per page. Defaults to 20, capped at 200.</summary>
    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = value < 1 ? 1 : value > 200 ? 200 : value;
    }

    /// <summary>Optional free-text search term applied by the service layer.</summary>
    public string? Search { get; set; }

    /// <summary>Column name to sort by. The service layer validates this against allowed columns.</summary>
    public string? SortBy { get; set; }

    /// <summary>Sort direction: "asc" (default) or "desc".</summary>
    public string SortDirection { get; set; } = "asc";

    /// <summary>Zero-based row offset, derived from Page and PageSize.</summary>
    public int Skip => (Page - 1) * PageSize;

    public bool IsDescending => SortDirection.Equals("desc", StringComparison.OrdinalIgnoreCase);
}
