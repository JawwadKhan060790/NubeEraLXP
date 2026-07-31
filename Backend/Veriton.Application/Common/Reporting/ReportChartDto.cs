using System.Collections.Generic;

namespace Veriton.Application.Common.Reporting;

/// <summary>
/// One named data series within a chart (e.g. "Present" vs "Absent" on an
/// attendance trend). <see cref="Data"/> is positionally aligned with the parent
/// <see cref="ReportChartDto.Labels"/> — index 0 of every series corresponds to
/// label 0, etc. This is the "standardized chart response model" the framework
/// needed (none existed previously; <c>Dashboard.tsx</c> used bespoke per-chart shapes).
/// </summary>
public class ReportChartSeriesDto
{
    public string Name { get; set; } = null!;
    public List<decimal> Data { get; set; } = new();

    /// <summary>Optional explicit colour (hex). When omitted, the frontend assigns from its standard palette so every chart in the app stays visually consistent.</summary>
    public string? Color { get; set; }
}

/// <summary>
/// One chart, fully described by real aggregated data computed from the same
/// scoped/filtered query the report's rows came from (never hardcoded — see
/// <see cref="ReportKpiDto"/> doc for the same constraint). The generic
/// <c>ReportChart</c> frontend component switches on <see cref="Type"/> and
/// renders with the existing <c>recharts</c> primitives — one component, five
/// chart types, reused by all 18 categories.
/// </summary>
public class ReportChartDto
{
    public string Key { get; set; } = null!;
    public string Title { get; set; } = null!;
    public ReportChartType Type { get; set; }

    /// <summary>Category labels shared by every series (e.g. month names, grade names, status buckets).</summary>
    public List<string> Labels { get; set; } = new();

    /// <summary>One or more data series. Pie/Donut charts conventionally carry exactly one series whose values sum to the represented whole.</summary>
    public List<ReportChartSeriesDto> Series { get; set; } = new();

    /// <summary>Optional axis/legend caption (e.g. "%", "Students", "₹").</summary>
    public string? ValueLabel { get; set; }

    public static ReportChartDto Single(string key, string title, ReportChartType type, IEnumerable<string> labels, string seriesName, IEnumerable<decimal> data, string? valueLabel = null)
        => new()
        {
            Key = key,
            Title = title,
            Type = type,
            Labels = new List<string>(labels),
            Series = new List<ReportChartSeriesDto> { new() { Name = seriesName, Data = new List<decimal>(data) } },
            ValueLabel = valueLabel
        };
}
