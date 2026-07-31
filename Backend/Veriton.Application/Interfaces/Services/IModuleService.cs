using Veriton.Application.Common.Models;
using Veriton.Application.DTOs;
using Veriton.Application.Pagination;

namespace Veriton.Application.Interfaces.Services;

public interface IModuleService : IGenericService<ModuleCreateDto, ModuleUpdateDto, ModuleDto>
{
    Task<PagedResponse<ModuleDto>> GetPagedAsync(PaginationRequest request);
}
