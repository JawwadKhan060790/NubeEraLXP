namespace Veriton.Application.Common.Reporting;

/// <summary>
/// Cell-level data type for a report grid column — mirrors
/// <see cref="Veriton.Application.Common.Export.ExportColumnType"/> so the same
/// metadata can drive both the on-screen grid and the export pipeline without
/// translation. Kept as a separate enum (rather than reusing the export one)
/// because reports additionally need to express a "Percent" shape that the raw
/// export engine has no opinion about.
/// </summary>
public enum ReportColumnType
{
    Text = 0,
    Number = 1,
    Currency = 2,
    Date = 3,
    DateTime = 4,
    Boolean = 5,
    Percent = 6
}

/// <summary>
/// Chart shapes the generic <c>ReportChart</c> frontend component knows how to
/// render. Matches the directive's required set exactly: Line, Bar, Pie, Donut, Area.
/// </summary>
public enum ReportChartType
{
    Line = 0,
    Bar = 1,
    Pie = 2,
    Donut = 3,
    Area = 4
}

/// <summary>
/// Export targets supported by the generic reporting export pipeline. Excel and
/// CSV are generated server-side (reusing the existing <c>IExcelExportService</c>
/// plus a thin CSV writer); PDF and Print are produced client-side from the same
/// on-screen report data via the browser's native print-to-PDF — see
/// <c>ReportExport</c> component notes for the rationale (no PDF-rendering
/// dependency exists in the backend, and browser print avoids adding an unverified
/// one while still satisfying "Export only filtered data" + the branded header).
/// </summary>
public enum ReportExportFormat
{
    Excel = 0,
    Csv = 1
}
