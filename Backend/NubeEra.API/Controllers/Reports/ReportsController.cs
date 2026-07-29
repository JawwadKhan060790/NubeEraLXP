using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NubeEra.Application.Common.Reporting;
using NubeEra.Application.Interfaces.Services.Reporting;

namespace NubeEra.API.Controllers.Reports;

/// <summary>
/// The ONE controller for the entire Reporting module — every report across all
/// 18 menu categories is reached through these three generic actions. This is
/// the API-surface half of "do not create separate report engines": adding
/// report #19 means registering one more <see cref="IReportDataProvider"/>
/// (see <c>AddApplication</c>); this controller, its routes, and its contracts
/// never change.
///
/// <c>[Authorize]</c> only — NOT a role-specific policy — because every role
/// (Admin through Student) is permitted to use Reports per the directive's
/// access spec; <see cref="IReportService"/> performs the actual per-report,
/// per-role authorization (and School-level isolation) centrally, the same way
/// <c>ApiResponseFilter</c>/<c>ExceptionHandlingMiddleware</c> centrally translate
/// the <see cref="UnauthorizedAccessException"/> it throws into a 403 envelope.
/// </summary>
[ApiController]
[Route("api/reports")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;
    private readonly IReportExportService _reportExportService;

    public ReportsController(IReportService reportService, IReportExportService reportExportService)
    {
        _reportService = reportService;
        _reportExportService = reportExportService;
    }

    /// <summary>
    /// GET /api/reports — the menu payload. Returns only the reports the CALLER's
    /// role may run (already grouped-by-category server-side via ordering; the
    /// frontend renders the 18 category groups by simply grouping on
    /// <see cref="ReportDefinitionSummaryDto.Category"/>). Powers both the
    /// Reports nav AND the "Custom Reports" report picker.
    /// </summary>
    [HttpGet]
    public IActionResult GetAvailableReports()
    {
        var reports = _reportService.GetAvailableReports();
        return Ok(reports);
    }

    /// <summary>
    /// POST /api/reports/{key}/run — executes one report with the supplied filter
    /// (School/Academic Year/Date Range/Grade/Subject/.../Search/Sort/Page — the
    /// ONE shared <see cref="ReportFilterDto"/>) and returns the single
    /// <see cref="ReportResponseDto"/> envelope: columns, the current page of
    /// rows, KPIs, charts, applied-filter echo, and paging metadata. POST (not
    /// GET) because <see cref="ReportFilterDto.AdvancedFilters"/>/<see cref="ReportFilterDto.SavedFilterName"/>
    /// can carry arbitrarily rich filter shapes that don't belong in a query string.
    /// </summary>
    [HttpPost("{key}/run")]
    public async Task<IActionResult> RunReport(string key, [FromBody] ReportFilterDto? filter, CancellationToken cancellationToken)
    {
        var response = await _reportService.GetReportAsync(key, filter ?? new ReportFilterDto(), cancellationToken);
        return Ok(response);
    }

    /// <summary>
    /// POST /api/reports/{key}/export — re-runs the report against the FULL
    /// filtered set (not just the on-screen page — "Export only filtered data"
    /// means everything that matches, see <see cref="IReportService.GetReportForExportAsync"/>)
    /// and streams back the requested format. Excel/CSV are produced server-side;
    /// PDF/Print are intentionally client-side (see <c>ReportExportService</c> doc) —
    /// requesting them here simply isn't wired up, by design, not by oversight.
    /// </summary>
    [HttpPost("{key}/export")]
    public async Task<IActionResult> ExportReport(string key, [FromBody] ReportRequestDto? request, CancellationToken cancellationToken)
    {
        var filter = request?.Filter ?? new ReportFilterDto();
        var format = request?.Format ?? ReportExportFormat.Excel;

        var (bytes, fileName, contentType, extension) = await _reportExportService.ExportAsync(key, filter, format, cancellationToken);

        return File(bytes, contentType, $"{fileName}.{extension}");
    }
}
