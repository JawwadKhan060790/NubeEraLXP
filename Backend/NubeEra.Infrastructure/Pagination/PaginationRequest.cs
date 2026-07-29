using System.Collections.Generic;

namespace NubeEra.Infrastructure.Pagination
{
    public class PaginationRequest
    {
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 20;
        public string Search { get; set; }
        public string SortBy { get; set; }
        public string SortDirection { get; set; } = "ASC";
        public Dictionary<string, string> Filters { get; set; } = new();
    }
}
