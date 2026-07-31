using System;
using System.Collections.Generic;
using System.Linq;
using Veriton.Application.Common.Reporting;

namespace Veriton.Application.Reporting.Providers;

/// <summary>
/// Small shared helpers used by every <see cref="Veriton.Application.Interfaces.Services.Reporting.IReportDataProvider"/>
/// so the generic in-process search/sort/page steps (every provider needs them —
/// they are NOT engine concerns because each provider's underlying shape differs)
/// are written once rather than copy-pasted 18+ times. This is the
/// "avoid duplicate implementations" requirement applied one layer below the
/// engine itself.
///
/// PERFORMANCE NOTE (documented here once for all providers): these helpers
/// operate on already-materialized in-memory sequences. For the pilot rollout
/// this mirrors how existing services (e.g. <c>StudentService.GetAllAsync</c>)
/// already work — load the scoped set, project, return. The directive's
/// "100,000+ records / server-side pagination / query optimization / caching /
/// streaming" targets are real and are called out explicitly in
/// REPORTING_MODULE.md as the documented next step: swap the
/// "materialize → sort/page in memory" calls below for
/// <c>IQueryable</c>-level <c>.OrderBy/.Skip/.Take</c> (EF Core translates these
/// to SQL `ORDER BY`/`OFFSET`/`FETCH`) plus a covering index per sortable column —
/// a mechanical, provider-by-provider change that does not alter this contract,
/// <see cref="IReportDataProvider"/>, or any consumer.
/// </summary>
internal static class ReportProviderHelpers
{
    /// <summary>Generic string-keyed sort + page over an already-filtered sequence. <paramref name="keySelectors"/> maps a SortBy key (case-insensitive) to a projection used for ordering.</summary>
    public static List<T> SortAndPage<T>(
        IEnumerable<T> source,
        ReportFilterDto filter,
        IReadOnlyDictionary<string, Func<T, IComparable?>> keySelectors,
        string defaultSortKey,
        out int totalCount)
    {
        var materialized = source.ToList();
        totalCount = materialized.Count;

        var sortKey = !string.IsNullOrWhiteSpace(filter.SortBy) && keySelectors.ContainsKey(filter.SortBy!)
            ? filter.SortBy!
            : defaultSortKey;

        if (keySelectors.TryGetValue(sortKey, out var selector))
        {
            materialized = string.Equals(filter.SortDirection, "desc", StringComparison.OrdinalIgnoreCase)
                ? materialized.OrderByDescending(selector).ToList()
                : materialized.OrderBy(selector).ToList();
        }

        var page = filter.Page < 1 ? 1 : filter.Page;
        var pageSize = filter.PageSize <= 0 ? 25 : filter.PageSize;

        return materialized.Skip((page - 1) * pageSize).Take(pageSize).ToList();
    }

    /// <summary>Percentage as 0-100, safe against a zero denominator.</summary>
    public static decimal SafePercentage(int numerator, int denominator)
        => denominator <= 0 ? 0m : Math.Round((decimal)numerator / denominator * 100m, 1);

    public static decimal SafePercentage(double numerator, double denominator)
        => denominator <= 0 ? 0m : Math.Round((decimal)(numerator / denominator * 100), 1);

    /// <summary>Case-insensitive "contains" guarding against null haystacks — the standard <see cref="ReportFilterDto.Search"/> predicate building block.</summary>
    public static bool ContainsIgnoreCase(string? haystack, string needle)
        => !string.IsNullOrEmpty(haystack) && haystack.Contains(needle, StringComparison.OrdinalIgnoreCase);

    /// <summary>Builds the last-12-month label/bucket scaffold used by several trend charts (e.g. enrollment growth, attendance trend) so the "real data, not hardcoded" month axis is computed consistently.</summary>
    public static List<(string Label, DateTime Start, DateTime End)> LastNMonthBuckets(int n, DateTime? anchor = null)
    {
        var end = (anchor ?? DateTime.UtcNow).Date;
        var buckets = new List<(string, DateTime, DateTime)>();

        for (var i = n - 1; i >= 0; i--)
        {
            var monthStart = new DateTime(end.Year, end.Month, 1).AddMonths(-i);
            var monthEnd = monthStart.AddMonths(1).AddTicks(-1);
            buckets.Add((monthStart.ToString("MMM yyyy"), monthStart, monthEnd));
        }

        return buckets;
    }

    public static string FullName(string? firstName, string? lastName)
        => string.Join(" ", new[] { firstName, lastName }.Where(s => !string.IsNullOrWhiteSpace(s)));
}
