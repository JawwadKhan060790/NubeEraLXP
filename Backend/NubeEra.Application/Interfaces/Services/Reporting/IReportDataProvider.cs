using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using NubeEra.Application.Common.Reporting;

namespace NubeEra.Application.Interfaces.Services.Reporting;

/// <summary>
/// The ONE extension point of the generic reporting engine. Every report —
/// across all 18 menu categories — is "just" an implementation of this
/// interface registered in DI; <see cref="IReportService"/>/<see cref="ReportService"/>
/// (the engine) never changes when a new report is added. This is precisely the
/// "generic reusable framework, no duplicate report engines" requirement: the
/// engine is generic, only the per-report DATA ACCESS varies, and that variation
/// is captured in the smallest possible seam (one method).
///
/// A provider MUST:
///   • declare which roles may run it (<see cref="AllowedRoles"/> — checked by
///     <see cref="IReportService"/> before <see cref="GetDataAsync"/> is ever invoked,
///     so a denied role's query never executes);
///   • scope its query by the (already RBAC-adjusted) <see cref="ReportFilterDto.SchoolId"/>
///     and any relevant person-identity filters itself, exactly like existing
///     services (e.g. <c>StudentService.GetAllAsync</c>) already do — the engine
///     does not (and structurally cannot) know how to scope an arbitrary domain query;
///   • compute <see cref="ReportDataResult.Kpis"/>/<see cref="ReportDataResult.Charts"/>
///     from the SAME filtered dataset as the rows (never a separate hardcoded query —
///     "real database data only").
/// </summary>
public interface IReportDataProvider
{
    /// <summary>Stable, URL-safe, kebab-case key (e.g. "student-attendance-summary"). Must be unique across ALL providers.</summary>
    string Key { get; }

    /// <summary>One of the 18 menu categories this report is grouped under (e.g. "Student Reports").</summary>
    string Category { get; }

    /// <summary>Display title shown in the menu and as the report's on-screen heading.</summary>
    string Title { get; }

    /// <summary>One- or two-sentence description shown under the title / as a menu tooltip.</summary>
    string Description { get; }

    /// <summary>
    /// Lower-case role keys permitted to run this report — drawn from the
    /// directive's verbatim role-based access spec (e.g. "admin", "principal",
    /// "staff", "teacher", "parent", "student"). <see cref="ReportService"/>
    /// rejects any caller whose <c>ICurrentUserService.Role</c> isn't in this set
    /// with <see cref="System.UnauthorizedAccessException"/> BEFORE the provider
    /// is ever asked for data.
    /// </summary>
    IReadOnlyList<string> AllowedRoles { get; }

    /// <summary>Ordered grid/export column metadata — defined once, drives both the on-screen grid and every export format.</summary>
    IReadOnlyList<ReportColumnDefinition> Columns { get; }

    /// <summary>
    /// Runs the (already RBAC-scoped) filter against this report's domain query and
    /// returns the page of rows plus KPIs/charts computed from the full filtered
    /// (not just the current page's) dataset. Implementations should apply
    /// <see cref="ReportFilterDto.Search"/>/<see cref="ReportFilterDto.SortBy"/>/paging
    /// themselves so providers retain full control over how their domain maps to
    /// those generic concepts (e.g. "Search" may match name OR ID OR email).
    /// </summary>
    Task<ReportDataResult> GetDataAsync(ReportFilterDto filter, CancellationToken cancellationToken = default);
}
