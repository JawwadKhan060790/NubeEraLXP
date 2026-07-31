namespace Veriton.Application.Common.Reporting;

/// <summary>
/// Declarative description of one report grid column. A
/// <see cref="Veriton.Application.Interfaces.Services.Reporting.IReportDataProvider"/>
/// declares an ordered list of these once; the same list drives the on-screen
/// <c>ReportGrid</c>, the sortable-column contract, and (via
/// <see cref="ToExportColumn"/>) the export pipeline — so column metadata is
/// defined exactly once per report, never duplicated between "what renders" and
/// "what exports".
/// </summary>
public class ReportColumnDefinition
{
    /// <summary>Lookup key matched against each row dictionary's keys.</summary>
    public string Key { get; set; } = null!;

    /// <summary>Human-readable column header.</summary>
    public string Header { get; set; } = null!;

    /// <summary>Determines default alignment/formatting in the grid and the native Excel type on export.</summary>
    public ReportColumnType Type { get; set; } = ReportColumnType.Text;

    /// <summary>Optional explicit display/number format string (e.g. "0.0%", "$#,##0.00").</summary>
    public string? Format { get; set; }

    /// <summary>Optional fixed column width (grid pixels and/or Excel character units).</summary>
    public double? Width { get; set; }

    /// <summary>Whether the grid may sort by this column (maps to <see cref="ReportFilterDto.SortBy"/>).</summary>
    public bool Sortable { get; set; } = true;

    /// <summary>Whether the column is visible in the on-screen grid by default (still exported when true unless <see cref="ExportOnly"/>/<see cref="GridOnly"/> say otherwise).</summary>
    public bool Visible { get; set; } = true;

    /// <summary>Column exists only for export (e.g. extra audit columns) — hidden from the on-screen grid.</summary>
    public bool ExportOnly { get; set; } = false;

    /// <summary>Column exists only on screen (e.g. row-action affordances) — omitted from exports.</summary>
    public bool GridOnly { get; set; } = false;

    public static ReportColumnDefinition Text(string key, string header, double? width = null, bool sortable = true)
        => new() { Key = key, Header = header, Type = ReportColumnType.Text, Width = width, Sortable = sortable };

    public static ReportColumnDefinition Number(string key, string header, double? width = null, string? format = null)
        => new() { Key = key, Header = header, Type = ReportColumnType.Number, Width = width, Format = format };

    public static ReportColumnDefinition Currency(string key, string header, double? width = null, string? format = null)
        => new() { Key = key, Header = header, Type = ReportColumnType.Currency, Width = width, Format = format };

    public static ReportColumnDefinition Percent(string key, string header, double? width = null)
        => new() { Key = key, Header = header, Type = ReportColumnType.Percent, Width = width, Format = "0.0%" };

    public static ReportColumnDefinition Date(string key, string header, double? width = null)
        => new() { Key = key, Header = header, Type = ReportColumnType.Date, Width = width };

    public static ReportColumnDefinition DateTime(string key, string header, double? width = null)
        => new() { Key = key, Header = header, Type = ReportColumnType.DateTime, Width = width };

    public static ReportColumnDefinition Boolean(string key, string header, double? width = null)
        => new() { Key = key, Header = header, Type = ReportColumnType.Boolean, Width = width };

    /// <summary>
    /// Projects this report column to an <see cref="Veriton.Application.Common.Export.ExportColumnDefinition"/>
    /// so <see cref="Veriton.Application.Interfaces.Services.Reporting.IReportExportService"/> can hand the
    /// exact same metadata to the shared <c>IExcelExportService</c> — one column model, two consumers, zero duplication.
    /// </summary>
    public Veriton.Application.Common.Export.ExportColumnDefinition ToExportColumn()
    {
        var exportType = Type switch
        {
            ReportColumnType.Number => Veriton.Application.Common.Export.ExportColumnType.Number,
            ReportColumnType.Currency => Veriton.Application.Common.Export.ExportColumnType.Currency,
            ReportColumnType.Date => Veriton.Application.Common.Export.ExportColumnType.Date,
            ReportColumnType.DateTime => Veriton.Application.Common.Export.ExportColumnType.DateTime,
            ReportColumnType.Boolean => Veriton.Application.Common.Export.ExportColumnType.Boolean,
            ReportColumnType.Percent => Veriton.Application.Common.Export.ExportColumnType.Number,
            _ => Veriton.Application.Common.Export.ExportColumnType.Text
        };

        return new Veriton.Application.Common.Export.ExportColumnDefinition
        {
            Key = Key,
            Header = Header,
            Type = exportType,
            Format = Format ?? (Type == ReportColumnType.Percent ? "0.0%" : null),
            Width = Width
        };
    }
}
