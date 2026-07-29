using System;
using System.Collections.Generic;

namespace NubeEra.Application.Common.Reporting;

/// <summary>
/// The ONE filter shape every report accepts — the directive's "common filters
/// every report must support" rendered as a single reusable contract instead of
/// per-report query parameters. Every <see cref="NubeEra.Application.Interfaces.Services.Reporting.IReportDataProvider"/>
/// receives exactly this object; providers simply ignore the members that don't
/// apply to their domain (e.g. a Course report ignores <see cref="ParentId"/>).
///
/// <see cref="NubeEra.Application.Services.Reporting.ReportService"/> is responsible
/// for enforcing RBAC/School-level isolation BEFORE a provider ever sees this object
/// (e.g. forcing <see cref="SchoolId"/> to the caller's school for non-admins) — so
/// providers can trust every value here is already permission-checked.
/// </summary>
public class ReportFilterDto
{
    // ── Scope filters ────────────────────────────────────────────────────────
    public Guid? SchoolId { get; set; }
    public string? AcademicYear { get; set; }

    // ── Time filters ─────────────────────────────────────────────────────────
    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }
    public int? Month { get; set; }      // 1-12
    public int? Quarter { get; set; }    // 1-4
    public int? Year { get; set; }

    // ── Academic / entity filters ────────────────────────────────────────────
    public Guid? GradeId { get; set; }     // also used as "Grade"/"Batch"
    public Guid? SubjectId { get; set; }   // Module — "Subject"
    public Guid? CourseId { get; set; }    // Module — "Course" (alias kept distinct for UI clarity)
    public Guid? BatchId { get; set; }     // Grade — "Batch" (alias kept distinct for UI clarity)

    // ── Person filters ───────────────────────────────────────────────────────
    public Guid? StudentId { get; set; }
    public Guid? ParentId { get; set; }
    public Guid? TeacherId { get; set; }
    public Guid? StaffId { get; set; }
    public Guid? PrincipalId { get; set; }

    // ── Status / search ──────────────────────────────────────────────────────
    public string? Status { get; set; }
    public string? Search { get; set; }

    // ── Sorting ──────────────────────────────────────────────────────────────
    public string? SortBy { get; set; }
    public string SortDirection { get; set; } = "asc"; // "asc" | "desc"

    // ── Pagination ───────────────────────────────────────────────────────────
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 25;

    /// <summary>
    /// Open-ended bag for report-specific "Advanced Filters" that don't warrant a
    /// first-class property (e.g. a Financial report's "PaymentMethod"). Keeps the
    /// shared contract closed while still letting individual reports extend it.
    /// </summary>
    public Dictionary<string, string>? AdvancedFilters { get; set; }

    /// <summary>
    /// Name of a previously "Saved Filter" being applied — purely informational at
    /// the data layer; the frontend resolves the saved filter to concrete field
    /// values (stored client-side, see <c>reportService.ts</c>) before calling the API.
    /// Echoed back in <see cref="ReportResponseDto.AppliedFilters"/> for display/export headers.
    /// </summary>
    public string? SavedFilterName { get; set; }

    /// <summary>Computes [start, end) UTC date bounds from whichever combination of date filters is present (DateFrom/DateTo, Year+Month, Year+Quarter, or Year alone). Returns null bounds when nothing date-related was supplied.</summary>
    public (DateTime? Start, DateTime? End) ResolveDateRange()
    {
        if (DateFrom.HasValue || DateTo.HasValue)
        {
            return (DateFrom, DateTo?.Date.AddDays(1).AddTicks(-1));
        }

        if (Year.HasValue && Month.HasValue)
        {
            var start = new DateTime(Year.Value, Month.Value, 1);
            return (start, start.AddMonths(1).AddTicks(-1));
        }

        if (Year.HasValue && Quarter.HasValue)
        {
            var startMonth = ((Quarter.Value - 1) * 3) + 1;
            var start = new DateTime(Year.Value, startMonth, 1);
            return (start, start.AddMonths(3).AddTicks(-1));
        }

        if (Year.HasValue)
        {
            var start = new DateTime(Year.Value, 1, 1);
            return (start, start.AddYears(1).AddTicks(-1));
        }

        return (null, null);
    }
}
