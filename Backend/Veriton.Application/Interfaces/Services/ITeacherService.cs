using Veriton.Application.Common.Models;
using Veriton.Application.DTOs;

namespace Veriton.Application.Interfaces.Services;

/// <summary>
/// Teacher management service contract.
/// </summary>
public interface ITeacherService : IGenericService<TeacherCreateDto, TeacherUpdateDto, TeacherDto>
{
    /// <summary>Returns a paginated list of teachers, scoped to the caller's school.</summary>
    Task<PagedResponse<TeacherDto>> GetPagedAsync(PagedRequest request);

    /// <summary>Returns the dashboard statistics view for a specific teacher.</summary>
    Task<TeacherDashboardDto?> GetDashboardAsync(Guid teacherId);

    /// <summary>Returns all teachers belonging to a specific school.</summary>
    Task<List<TeacherDto>> GetBySchoolAsync(Guid schoolId);
}
