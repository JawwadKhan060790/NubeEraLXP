using System.Collections.Generic;

namespace NubeEra.Application.Pagination
{
    /// <summary>
    /// Common pagination and filtering request. Bound from query-string via [FromQuery].
    /// ASP.NET Core's model binder is case-insensitive, so callers may use camelCase,
    /// snake_case, or PascalCase query-parameter names interchangeably.
    /// </summary>
    public class PaginationRequest
    {
        /// <summary>1-based page number. Clamped to ≥1 in the service layer.</summary>
        public int PageNumber { get; set; } = 1;

        /// <summary>Records per page. Clamped to [1, 200] in the service layer.</summary>
        public int PageSize { get; set; } = 20;

        /// <summary>Free-text search applied across key searchable fields.</summary>
        public string? Search { get; set; }

        /// <summary>Column name to sort by.</summary>
        public string? SortBy { get; set; }

        /// <summary>"ASC" or "DESC".</summary>
        public string SortDirection { get; set; } = "ASC";

        // ── Typed convenience filters (avoids untyped Filters dictionary for common cases) ──

        /// <summary>Filter by grade ID.</summary>
        public Guid? GradeId { get; set; }

        /// <summary>Filter by unit/module ID.</summary>
        public Guid? UnitId { get; set; }

        /// <summary>Alias for UnitId.</summary>
        public Guid? ModuleId { get; set; }

        /// <summary>Filter by school ID (only applied when the caller is not school-scoped).</summary>
        public Guid? SchoolId { get; set; }

        /// <summary>
        /// Filter by active status. Null = default behaviour (active-only for list views).
        /// Pass false to retrieve inactive records explicitly.
        /// </summary>
        public bool? IsActive { get; set; }

        /// <summary>Arbitrary extra filters for ad-hoc use by specific endpoints.</summary>
        public Dictionary<string, string> Filters { get; set; } = new();
    }
}
