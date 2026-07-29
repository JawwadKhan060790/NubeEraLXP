using NubeEra.Application.Common.Models;
using NubeEra.Application.DTOs;
using NubeEra.Application.Pagination;

namespace NubeEra.Application.Interfaces.Services;

public interface IModuleService : IGenericService<ModuleCreateDto, ModuleUpdateDto, ModuleDto>
{
    Task<PagedResponse<ModuleDto>> GetPagedAsync(PaginationRequest request);
}
