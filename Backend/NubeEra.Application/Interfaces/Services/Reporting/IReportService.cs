using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using NubeEra.Application.Common.Reporting;

namespace NubeEra.Application.Interfaces.Services.Reporting;

/// <summary>
/// The generic Reporting engine — the ONE service every report flows through
/// (<c>IReportService</c>/<c>ReportService</c> from the directive). It owns
/// everything that is identical across all 18 categories: discovering which
/// reports the caller may see, RBAC + School-level isolation enforcement,
/// delegating to the matching <see cref="IReportDataProvider"/>, and assembling
/// the single <see cref="ReportResponseDto"/> envelope (paging echo, applied
/// filters, generated-by/at stamps). No per-category service exists or should
/// ever be created — that is precisely the duplication the directive forbids.
/// </summary>
public interface IReportService
{
    /// <summary>
    /// Returns the menu of reports the CURRENT caller is permitted to run —
    /// already filtered by role (<see cref="IReportDataProvider.AllowedRoles"/>),
    /// grouped implicitly by <see cref="ReportDefinitionSummaryDto.Category"/>
    /// (the frontend groups client-side to render the 18-category nav). This is
    /// what makes the menu role-aware without any hardcoded per-role report lists.
    /// </summary>
    IReadOnlyList<ReportDefinitionSummaryDto> GetAvailableReports();

    /// <summary>
    /// Runs the named report for the current caller: validates the key exists and
    /// the caller's role is allowed, normalizes/clamps paging, enforces
    /// School-level data isolation (non-admins are pinned to their own school
    /// regardless of what <see cref="ReportFilterDto.SchoolId"/> they pass), then
    /// delegates to the provider and wraps the result. Throws
    /// <see cref="NubeEra.Domain.Common.AppException"/> for an unknown key and
    /// <see cref="System.UnauthorizedAccessException"/> for a disallowed role —
    /// both already understood by <c>ExceptionHandlingMiddleware</c>.
    /// </summary>
    Task<ReportResponseDto> GetReportAsync(string key, ReportFilterDto filter, CancellationToken cancellationToken = default);

    /// <summary>
    /// Re-runs the named report with paging effectively disabled (caps at a hard
    /// ceiling — see implementation) so exports honour "Export only filtered data"
    /// against the FULL filtered set rather than just the on-screen page. Used
    /// exclusively by <see cref="IReportExportService"/> — never exposed as a
    /// "give me everything" endpoint on its own.
    /// </summary>
    Task<ReportResponseDto> GetReportForExportAsync(string key, ReportFilterDto filter, CancellationToken cancellationToken = default);
}
