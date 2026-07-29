using NubeEra.Application.Common.Models;
using NubeEra.Application.DTOs;
using NubeEra.Application.Pagination;

namespace NubeEra.Application.Interfaces.Services;

public interface ILessonService : IGenericService<LessonCreateDto, LessonUpdateDto, LessonDto>
{
    Task<PagedResponse<LessonDto>> GetPagedAsync(PaginationRequest request);
    Task MarkAsCompletedAsync(Guid lessonId);
    Task MarkAsIncompleteAsync(Guid lessonId);
    Task<List<Guid>> GetCompletedLessonIdsAsync();
}
