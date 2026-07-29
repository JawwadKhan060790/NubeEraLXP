using NubeEra.Application.Common.Models;
using NubeEra.Application.DTOs;
using NubeEra.Application.Pagination;

namespace NubeEra.Application.Interfaces.Services;

/// <summary>
/// Student management service contract.
/// Replaces the anonymous <c>IGenericService&lt;StudentCreateDto, StudentUpdateDto, StudentDto&gt;</c>
/// registration with a named, discoverable interface that can carry student-specific operations.
/// </summary>
public interface IStudentService : IGenericService<StudentCreateDto, StudentUpdateDto, StudentDto>
{
    /// <summary>Returns a paginated list of students, scoped to the caller's school.</summary>
    Task<PagedResponse<StudentDto>> GetPagedAsync(PaginationRequest request);

    /// <summary>Imports students from a CSV stream. Returns the count of rows created.</summary>
    Task<int> BulkImportCsvAsync(Stream csvStream);

    /// <summary>Returns the dashboard statistics for a specific student.</summary>
    Task<StudentDashboardDto?> GetDashboardAsync(Guid studentId);

    /// <summary>Returns lesson-level progress detail for a specific student.</summary>
    Task<StudentProgressDto?> GetProgressAsync(Guid studentId);
}
