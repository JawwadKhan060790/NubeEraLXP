using Veriton.Application.Common.Models;
using Veriton.Application.DTOs;
using Veriton.Application.Pagination;

namespace Veriton.Application.Interfaces.Services;

public interface ILessonService : IGenericService<LessonCreateDto, LessonUpdateDto, LessonDto>
{
    Task<PagedResponse<LessonDto>> GetPagedAsync(PaginationRequest request);
    Task MarkAsCompletedAsync(Guid lessonId);
    Task MarkAsIncompleteAsync(Guid lessonId);
    Task<List<Guid>> GetCompletedLessonIdsAsync();
}
