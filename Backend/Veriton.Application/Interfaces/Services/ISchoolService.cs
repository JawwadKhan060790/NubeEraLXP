using Veriton.Application.Common.Models;
using Veriton.Application.DTOs;

namespace Veriton.Application.Interfaces.Services;

/// <summary>
/// School management service contract.
/// </summary>
public interface ISchoolService : IGenericService<SchoolCreateDto, SchoolUpdateDto, SchoolDto>
{
    /// <summary>Returns a paginated list of all schools.</summary>
    Task<PagedResponse<SchoolDto>> GetPagedAsync(PagedRequest request);

    /// <summary>Returns the school that a specific user belongs to, or null.</summary>
    Task<SchoolDto?> GetByUserIdAsync(Guid userId);

    /// <summary>Activates or deactivates a school. Throws NotFoundException if not found.</summary>
    Task SetActiveAsync(Guid id, bool isActive);
}
