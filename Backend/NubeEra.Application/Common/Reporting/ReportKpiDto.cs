namespace NubeEra.Application.Common.Reporting;

/// <summary>
/// One KPI card value. Providers compute these from the SAME scoped/filtered
/// dataset they return as rows (never a separate hardcoded query) — satisfying
/// "All charts/cards must display real database data only. No hardcoded values."
/// </summary>
public class ReportKpiDto
{
    /// <summary>Stable key (e.g. "total_students") — lets the frontend apply icons/ordering without string-matching labels.</summary>
    public string Key { get; set; } = null!;

    /// <summary>Display label (e.g. "Total Students").</summary>
    public string Label { get; set; } = null!;

    /// <summary>Numeric value. Percentages are expressed as 0-100 (the frontend appends "%" per <see cref="Format"/>).</summary>
    public decimal Value { get; set; }

    /// <summary>"number" | "percent" | "currency" | "decimal" — tells <c>ReportChart</c>/KPI card how to render <see cref="Value"/>.</summary>
    public string Format { get; set; } = "number";

    /// <summary>Optional comparison value from the prior equivalent period (e.g. previous month) for trend display. Null when no comparison baseline exists.</summary>
    public decimal? PreviousValue { get; set; }

    /// <summary>Optional lucide-react icon name hint for the frontend KPI card (purely cosmetic; frontend falls back to a sensible default per <see cref="Format"/>).</summary>
    public string? Icon { get; set; }

    public static ReportKpiDto Number(string key, string label, decimal value, string? icon = null)
        => new() { Key = key, Label = label, Value = value, Format = "number", Icon = icon };

    public static ReportKpiDto Percent(string key, string label, decimal value, string? icon = null)
        => new() { Key = key, Label = label, Value = value, Format = "percent", Icon = icon };

    public static ReportKpiDto Currency(string key, string label, decimal value, string? icon = null)
        => new() { Key = key, Label = label, Value = value, Format = "currency", Icon = icon };
}
