using Veriton.Application.Common.Models;
using Veriton.Application.DTOs;
using Veriton.Application.Pagination;

namespace Veriton.Application.Interfaces.Services;

public interface IQuestionService : IGenericService<QuestionCreateDto, QuestionUpdateDto, QuestionDto>
{
    Task<PagedResponse<QuestionDto>> GetPagedAsync(PaginationRequest request);
}
