using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Services;
using NubeEra.Application.Pagination;
using NubeEra.Domain.Common;

namespace NubeEra.API.Controllers.Academic;

[ApiController]
[Route("api/questions")]
[Authorize]
public class QuestionsController : ControllerBase
{
    private readonly IQuestionService _service;

    public QuestionsController(IQuestionService service)
    {
        _service = service;
    }

    /// <summary>
    /// Get all questions (non-paginated). Kept for backward compatibility.
    /// Prefer GET /api/questions/paged for large datasets.
    /// </summary>
    [HttpGet]
    [Authorize(Policy = "StudentOnly")]
    public async Task<IActionResult> GetAll()
        => Ok(await _service.GetAllAsync());

    /// <summary>
    /// Server-side paginated questions. Supports search, examId/moduleId filter, sorting.
    /// Query params: pageNumber, pageSize, search, examId/moduleId (in filters), sortBy, sortDirection, isActive
    /// </summary>
    [HttpGet("paged")]
    [Authorize(Policy = "StudentOnly")]
    public async Task<IActionResult> GetPaged([FromQuery] PaginationRequest request)
        => Ok(await _service.GetPagedAsync(request));

    [HttpGet("{id}")]
    [Authorize(Policy = "StudentOnly")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var question = await _service.GetByIdAsync(id);
        return question == null ? NotFound() : Ok(question);
    }

    [HttpPost]
    [Authorize(Policy = "TeacherOnly")]  // Staff and above can create questions
    public async Task<IActionResult> Create(QuestionCreateDto dto)
        => Ok(new { id = await _service.CreateAsync(dto) });

    [HttpPut("{id}")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> Update(Guid id, QuestionUpdateDto dto)
    {
        await _service.UpdateAsync(id, dto);
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }
}

