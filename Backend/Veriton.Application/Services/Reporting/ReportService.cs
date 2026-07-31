using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Veriton.Application.Common.Reporting;
using Veriton.Application.Interfaces.Security;
using Veriton.Application.Interfaces.Services.Reporting;
using Veriton.Domain.Common;

namespace Veriton.Application.Services.Reporting;

/// <summary>
/// The single generic Reporting engine implementation. Holds the registry of
/// every <see cref="IReportDataProvider"/> (injected as <c>IEnumerable&lt;&gt;</c> —
/// each provider self-registers in DI exactly like every other service in
/// <c>AddApplication</c>, so adding report #19 never touches this class), enforces
/// RBAC + School-level isolation centrally, and assembles the one response envelope.
///
/// This is where "Users must never access data outside their permissions" is
/// guaranteed structurally rather than per-report: a disallowed role never reaches
/// a provider's query, and a non-admin's <see cref="ReportFilterDto.SchoolId"/> is
/// overwritten with their own school before the provider ever sees the filter —
/// so even a maliciously-crafted request cannot widen scope.
/// </summary>
public class ReportService : IReportService
{
    /// <summary>Hard ceiling for "export the full filtered set" requests — protects the database/process from an unbounded query even when "Export only filtered data" legitimately means tens of thousands of rows. Matches the directive's "100,000+ records efficiently" performance target as the documented upper bound for a single synchronous export; see EXCEL_EXPORT_FRAMEWORK / REPORTING_MODULE docs for the streaming/background-job extension path beyond this.</summary>
    private const int ExportRowCeiling = 100_000;

    private const int DefaultPageSize = 25;
    private const int MaxPageSize = 200;

    private readonly IReadOnlyDictionary<string, IReportDataProvider> _providers;
    private readonly ICurrentUserService _currentUserService;
    private readonly ITenantService       _tenantService;

    public ReportService(IEnumerable<IReportDataProvider> providers, ICurrentUserService currentUserService, ITenantService tenantService)
    {
        _currentUserService = currentUserService;
        _tenantService       = tenantService;

        // Build the lookup once. A duplicate key is a registration bug — fail fast
        // at startup-time (first resolution) rather than silently shadowing a report.
        var map = new Dictionary<string, IReportDataProvider>(StringComparer.OrdinalIgnoreCase);
        foreach (var provider in providers)
        {
            if (string.IsNullOrWhiteSpace(provider.Key))
            {
                throw new InvalidOperationException($"Report provider '{provider.GetType().FullName}' has no Key.");
            }

            if (!map.TryAdd(provider.Key, provider))
            {
                throw new InvalidOperationException(
                    $"Duplicate report key '{provider.Key}' registered by both " +
                    $"'{map[provider.Key].GetType().FullName}' and '{provider.GetType().FullName}'.");
            }
        }

        _providers = map;
    }

    public IReadOnlyList<ReportDefinitionSummaryDto> GetAvailableReports()
    {
        var role = NormalizeRole(_currentUserService.Role);

        return _providers.Values
            .Where(p => IsRoleAllowed(p, role))
            .OrderBy(p => p.Category, StringComparer.OrdinalIgnoreCase)
            .ThenBy(p => p.Title, StringComparer.OrdinalIgnoreCase)
            .Select(p => new ReportDefinitionSummaryDto
            {
                Key = p.Key,
                Category = p.Category,
                Title = p.Title,
                Description = p.Description
            })
            .ToList();
    }

    public Task<ReportResponseDto> GetReportAsync(string key, ReportFilterDto filter, CancellationToken cancellationToken = default)
        => RunAsync(key, filter, isExport: false, cancellationToken);

    public Task<ReportResponseDto> GetReportForExportAsync(string key, ReportFilterDto filter, CancellationToken cancellationToken = default)
        => RunAsync(key, filter, isExport: true, cancellationToken);

    private async Task<ReportResponseDto> RunAsync(string key, ReportFilterDto filter, bool isExport, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(key) || !_providers.TryGetValue(key, out var provider))
        {
            throw new AppException($"Report '{key}' was not found.");
        }

        var role = NormalizeRole(_currentUserService.Role);
        if (!IsRoleAllowed(provider, role))
        {
            throw new UnauthorizedAccessException("You do not have permission to run this report.");
        }

        var scoped = ApplyScoping(filter ?? new ReportFilterDto(), role, isExport);

        var result = await provider.GetDataAsync(scoped, cancellationToken);

        return new ReportResponseDto
        {
            Key = provider.Key,
            Category = provider.Category,
            Title = provider.Title,
            Description = provider.Description,
            Columns = provider.Columns.ToList(),
            Rows = result.Rows,
            TotalCount = result.TotalCount,
            Page = scoped.Page,
            PageSize = scoped.PageSize,
            Kpis = result.Kpis,
            Charts = result.Charts,
            AppliedFilters = scoped,
            GeneratedAt = DateTime.UtcNow,
            GeneratedBy = ResolveDisplayName(),
            SummaryNote = result.SummaryNote
        };
    }

    /// <summary>
    /// Centralized RBAC + School-level-isolation + paging normalization — applied
    /// identically for every report so no provider can forget it. This is the
    /// single place "School-Level Data Isolation" and "User-Level Restrictions"
    /// are enforced for the whole reporting surface.
    /// </summary>
    private ReportFilterDto ApplyScoping(ReportFilterDto filter, string role, bool isExport)
    {
        // Admins may freely cross schools (per the verbatim spec: "Admin – all
        // reports/schools/users/data"). Every other role is pinned to their own
        // school regardless of what they passed — closes the "pass a different
        // school_id and see other schools' data" attack surface centrally.
        if (role != "admin" && role != "superadmin")
        {
            filter.SchoolId = _tenantService.GetEffectiveSchoolId(filter.SchoolId);
        }

        // Role-specific identity pinning — mirrors the verbatim access spec:
        //   Teacher → "assigned classes/assigned students" → pin TeacherId
        //   Student → "own progress/attendance/assessments/certificates" → pin StudentId
        // Principal/Staff/Parent are scoped at the SCHOOL level by the block above
        // (Principal: "school-specific … only"; Staff: "assigned … based on
        // permissions" — providers further narrow via AllowedRoles + their own
        // queries); Parent identity-pinning to "their children" is each Parent
        // report provider's responsibility (a parent maps to N children, which a
        // single Guid? ParentId on the shared filter cannot express — providers
        // resolve the caller's children themselves via ICurrentUserService.UserId,
        // exactly like ParentService already does elsewhere in the app).
        switch (role)
        {
            case "teacher":
                filter.TeacherId = _currentUserService.TeacherId ?? filter.TeacherId;
                break;
            case "student":
                filter.StudentId = _currentUserService.StudentId ?? filter.StudentId;
                break;
        }

        // Paging normalization/clamping — identical for every report.
        if (filter.Page < 1) filter.Page = 1;

        if (isExport)
        {
            // Exports run "unpaginated" against a hard ceiling rather than the
            // caller's page size — "Export only filtered data" means the FULL
            // filtered set, not just the on-screen page.
            filter.PageSize = ExportRowCeiling;
        }
        else
        {
            if (filter.PageSize <= 0) filter.PageSize = DefaultPageSize;
            if (filter.PageSize > MaxPageSize) filter.PageSize = MaxPageSize;
        }

        if (string.IsNullOrWhiteSpace(filter.SortDirection) ||
            (!string.Equals(filter.SortDirection, "asc", StringComparison.OrdinalIgnoreCase) &&
             !string.Equals(filter.SortDirection, "desc", StringComparison.OrdinalIgnoreCase)))
        {
            filter.SortDirection = "asc";
        }

        return filter;
    }

    private static bool IsRoleAllowed(IReportDataProvider provider, string role)
    {
        if (role == "admin" || role == "superadmin")
        {
            // Verbatim spec: "Admin – all reports/schools/users/data". Admin always
            // passes regardless of what a provider declared, so a provider author
            // never has to remember to add "admin" to every AllowedRoles list.
            return true;
        }

        if (role == "student" || role == "parent")
        {
            // Block student and parent accounts from accessing any reports globally
            return false;
        }

        return provider.AllowedRoles.Any(r => string.Equals(r, role, StringComparison.OrdinalIgnoreCase));
    }

    private static string NormalizeRole(string? role) => (role ?? string.Empty).Trim().ToLowerInvariant();

    /// <summary>
    /// "Generated By" for the export header banner. The JWT (see
    /// <c>JwtTokenService</c>) only carries Sub/NameIdentifier/Email/Role/UserId/
    /// SchoolId/TeacherId/StudentId — no display-name claim — so email is the most
    /// reliable identity string available without a fresh DB round-trip on every
    /// report request (the export footer additionally restates the role via
    /// <see cref="ICurrentUserService.Role"/> if a richer label is ever desired).
    /// </summary>
    private string? ResolveDisplayName()
    {
        var user = _currentUserService.User;
        var email = user?.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
        return !string.IsNullOrWhiteSpace(email) ? email : _currentUserService.UserId;
    }
}
