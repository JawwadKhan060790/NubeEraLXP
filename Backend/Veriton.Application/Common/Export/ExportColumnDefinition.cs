namespace Veriton.Application.Common.Export;

/// <summary>
/// Cell-level data type understood by <see cref="IExcelExportService"/> /
/// <see cref="ExcelExportService"/> implementations so values are written into
/// the worksheet with the correct native Excel type and number format, instead
/// of every column collapsing to plain text.
/// </summary>
public enum ExportColumnType
{
    Text = 0,
    Number = 1,
    Currency = 2,
    Date = 3,
    DateTime = 4,
    Boolean = 5
}

/// <summary>
/// Declarative description of a single exported column. Controllers/services build
/// a list of these (see <see cref="ExportConfiguration"/>) instead of hand-rolling
/// per-module export logic — this is the "metadata describes the report" contract
/// requested for the generic Excel/Reporting framework.
/// </summary>
public class ExportColumnDefinition
{
    /// <summary>
    /// Lookup key matched against each row dictionary's keys (see
    /// <see cref="IExcelExportService.GenerateExcel"/>). Conventionally snake_case
    /// or camelCase to mirror the same projection already used for the JSON
    /// response of the underlying list endpoint — keeps "reuse existing API shape"
    /// rather than inventing a parallel data contract.
    /// </summary>
    public string Key { get; set; } = null!;

    /// <summary>Human-readable column header written into row 1 (or 3 if a title is set).</summary>
    public string Header { get; set; } = null!;

    /// <summary>Determines the native Excel value type and default number format.</summary>
    public ExportColumnType Type { get; set; } = ExportColumnType.Text;

    /// <summary>Optional explicit Excel number format string (overrides the type default).</summary>
    public string? Format { get; set; }

    /// <summary>Optional fixed column width in Excel character units. When omitted for every column, widths auto-fit.</summary>
    public double? Width { get; set; }

    public static ExportColumnDefinition Text(string key, string header, double? width = null)
        => new() { Key = key, Header = header, Type = ExportColumnType.Text, Width = width };

    public static ExportColumnDefinition Number(string key, string header, double? width = null, string? format = null)
        => new() { Key = key, Header = header, Type = ExportColumnType.Number, Width = width, Format = format };

    public static ExportColumnDefinition Currency(string key, string header, double? width = null, string? format = null)
        => new() { Key = key, Header = header, Type = ExportColumnType.Currency, Width = width, Format = format };

    public static ExportColumnDefinition Date(string key, string header, double? width = null)
        => new() { Key = key, Header = header, Type = ExportColumnType.Date, Width = width };

    public static ExportColumnDefinition DateTime(string key, string header, double? width = null)
        => new() { Key = key, Header = header, Type = ExportColumnType.DateTime, Width = width };

    public static ExportColumnDefinition Boolean(string key, string header, double? width = null)
        => new() { Key = key, Header = header, Type = ExportColumnType.Boolean, Width = width };
}
