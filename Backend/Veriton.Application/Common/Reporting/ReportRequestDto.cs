namespace Veriton.Application.Common.Reporting;

/// <summary>
/// Envelope POSTed to <c>/api/reports/{key}/run</c> and <c>/api/reports/{key}/export</c> —
/// pairs the report's stable key with the one shared <see cref="ReportFilterDto"/>.
/// Kept as its own type (rather than just taking <see cref="ReportFilterDto"/> directly)
/// so the export endpoint can additionally carry <see cref="Format"/> without
/// growing the filter contract with export-only concerns.
/// </summary>
public class ReportRequestDto
{
    /// <summary>Report key — also present on the route for REST-friendliness; when both are supplied the route wins (defensive — see <c>ReportsController</c>).</summary>
    public string? Key { get; set; }

    public ReportFilterDto Filter { get; set; } = new();

    /// <summary>Export-only: target format. Ignored by the "run" endpoint.</summary>
    public ReportExportFormat Format { get; set; } = ReportExportFormat.Excel;
}
