using NubeEra.Application.Common.Models;
using NubeEra.Application.DTOs;
using NubeEra.Application.Pagination;

namespace NubeEra.Application.Interfaces.Services;

public interface IQuestionService : IGenericService<QuestionCreateDto, QuestionUpdateDto, QuestionDto>
{
    Task<PagedResponse<QuestionDto>> GetPagedAsync(PaginationRequest request);
}
