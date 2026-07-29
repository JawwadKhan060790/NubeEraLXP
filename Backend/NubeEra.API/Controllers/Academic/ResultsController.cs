using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Repositories;
using NubeEra.Application.Interfaces.Services;
using NubeEra.Domain.Entities;

namespace NubeEra.API.Controllers.Academic;

[ApiController]
[Route("api/results")]
[Authorize]
public class ResultsController : ControllerBase
{
    private readonly IGenericService<ResultCreateDto, ResultUpdateDto, ResultDto> _service;
    private readonly IGenericRepository<Result> _resultRepo;

    public ResultsController(
        IGenericService<ResultCreateDto, ResultUpdateDto, ResultDto> service,
        IGenericRepository<Result> resultRepo)
    {
        _service    = service;
        _resultRepo = resultRepo;
    }

    [HttpGet]
    [Authorize(Policy = "StudentOnly")]
    public async Task<IActionResult> GetAll()
        => Ok(await _service.GetAllAsync());

    [HttpGet("{id}")]
    [Authorize(Policy = "StudentOnly")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _service.GetByIdAsync(id);
        return result == null ? NotFound() : Ok(result);
    }

    [HttpPost]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> Create(ResultCreateDto dto)
        => Ok(new { id = await _service.CreateAsync(dto) });

    [HttpPut("{id}")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> Update(Guid id, ResultUpdateDto dto)
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

    /// <summary>
    /// GET /api/results/student/{studentId}?gradeId=
    /// Returns all published exam results for a student, enriched with Exam and Module (subject) data.
    /// Used by the Report Card generation form to pre-fill subject marks automatically.
    /// </summary>
    [HttpGet("student/{studentId:guid}")]
    [Authorize(Roles = "SuperAdmin,Admin,Principal,Staff,Teacher")]
    public async Task<IActionResult> GetByStudent(Guid studentId, [FromQuery] Guid? gradeId)
    {
        var results = await _resultRepo.GetAllAsync(q =>
        {
            var query = q
                .Include(r => r.Exam)
                    .ThenInclude(e => e.Module)
                .Where(r => r.StudentId == studentId && r.IsPublished);

            if (gradeId.HasValue)
                query = query.Where(r => r.Exam.GradeId == gradeId.Value);

            return query.OrderBy(r => r.Exam.Module!.Name).ThenBy(r => r.Exam.Date);
        });

        var dtos = results.Select(r => new ExamResultForReportCardDto
        {
            ExamId        = r.ExamId,
            ExamTitle     = r.Exam?.Title ?? "",
            SubjectName   = r.Exam?.Module?.Name ?? r.Exam?.Title ?? "Unknown Subject",
            MaxMarks      = r.Exam?.TotalMarks ?? 100,
            ObtainedMarks = r.ObtainedMarks,
            Grade         = r.Grade,
            Remarks       = r.Remarks,
            ExamDate      = r.Exam?.Date ?? r.CreatedAt,
        });

        return Ok(dtos);
    }
}

