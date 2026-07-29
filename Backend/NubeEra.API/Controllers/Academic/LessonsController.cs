using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NubeEra.Application.Common.Export;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Services;
using NubeEra.Application.Interfaces.Services.Export;
using NubeEra.Application.Pagination;
using NubeEra.Domain.Common;

namespace NubeEra.API.Controllers.Academic;

[ApiController]
[Route("api/lessons")]
[Authorize]
public class LessonsController : ControllerBase
{
    private readonly ILessonService _service;
    private readonly IExcelExportService _excelExportService;
    private readonly ILogger<LessonsController> _logger;

    private static readonly IReadOnlyList<ExportColumnDefinition> LessonExportColumns = new List<ExportColumnDefinition>
    {
        ExportColumnDefinition.Number("serial_number", "#", 8),
        ExportColumnDefinition.Text("sub_topic", "Topic / Sub-Topic", 36),
        ExportColumnDefinition.Text("module_name", "Unit (Module)", 26),
        ExportColumnDefinition.Text("activity", "Activity Type", 22),
        ExportColumnDefinition.Number("total_hours", "Hours", 10),
        ExportColumnDefinition.Text("created_by_teacher_name", "Created By", 24),
        ExportColumnDefinition.Boolean("is_activity", "Is Activity", 12),
        ExportColumnDefinition.Boolean("is_python_activity", "Python", 10),
        ExportColumnDefinition.Boolean("is_robotics_activity", "Robotics", 10),
        ExportColumnDefinition.Boolean("is_active", "Active", 10),
    };

    public LessonsController(ILessonService service, IExcelExportService excelExportService, ILogger<LessonsController> logger)
    {
        _service = service;
        _excelExportService = excelExportService;
        _logger = logger;
    }

    /// <summary>
    /// Get all lessons (non-paginated). Kept for backward compatibility.
    /// Prefer GET /api/lessons/paged for large datasets.
    /// </summary>
    [HttpGet]
    [Authorize(Policy = "StudentOnly")]
    public async Task<IActionResult> GetAll()
        => Ok(await _service.GetAllAsync());

    [HttpGet("export")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> Export()
    {
        var lessons = await _service.GetAllAsync();
        var rows = lessons.Select(l => (IReadOnlyDictionary<string, object?>)new Dictionary<string, object?>
        {
            ["serial_number"] = (object?)l.SerialNumber,
            ["sub_topic"] = l.SubTopic,
            ["module_name"] = l.ModuleName,
            ["activity"] = l.Activity,
            ["total_hours"] = (object?)l.TotalHours,
            ["created_by_teacher_name"] = l.CreatedByTeacherName,
            ["is_activity"] = l.IsActivity,
            ["is_python_activity"] = l.IsPythonActivity,
            ["is_robotics_activity"] = l.IsRoboticsActivity,
            ["is_active"] = l.IsActive,
        }).ToList();
        var configuration = ExportConfiguration.Create(
            fileName: $"lessons-export-{DateTime.UtcNow:yyyyMMdd-HHmmss}",
            sheetName: "Lessons",
            columns: LessonExportColumns,
            title: "Lesson Directory");
        var fileBytes = _excelExportService.GenerateExcel(rows, configuration);
        return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"{configuration.FileName}.xlsx");
    }

    /// <summary>
    /// Server-side paginated lessons. Supports search, moduleId filter, gradeId filter, sorting.
    /// Query params: pageNumber, pageSize, search, moduleId (in filters), gradeId, sortBy, sortDirection, isActive
    /// </summary>
    [HttpGet("paged")]
    [Authorize(Policy = "StudentOnly")]
    public async Task<IActionResult> GetPaged([FromQuery] PaginationRequest request)
        => Ok(await _service.GetPagedAsync(request));

    [HttpGet("{id}")]
    [Authorize(Policy = "StudentOnly")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var lesson = await _service.GetByIdAsync(id);
        return lesson == null ? NotFound() : Ok(lesson);
    }

    [HttpPost]
    [Authorize(Policy = "TeacherOnly")]  // Staff and above can create lessons
    public async Task<IActionResult> Create(LessonCreateDto dto)
    {
        try
        {
            var id = await _service.CreateAsync(dto);
            return Ok(new { id });
        }
        catch (GradeAccessForbiddenException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating lesson");
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> Update(Guid id, LessonUpdateDto dto)
    {
        try
        {
            await _service.UpdateAsync(id, dto);
            return NoContent();
        }
        catch (GradeAccessForbiddenException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating lesson {Id}", id);
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            await _service.DeleteAsync(id);
            return NoContent();
        }
        catch (GradeAccessForbiddenException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting lesson {Id}", id);
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/complete")]
    [Authorize(Policy = "StudentOnly")]
    public async Task<IActionResult> MarkCompleted(Guid id)
    {
        await _service.MarkAsCompletedAsync(id);
        return Ok();
    }

    [HttpDelete("{id}/complete")]
    [Authorize(Policy = "StudentOnly")]
    public async Task<IActionResult> MarkIncomplete(Guid id)
    {
        await _service.MarkAsIncompleteAsync(id);
        return Ok();
    }

    [HttpGet("completed")]
    [Authorize(Policy = "StudentOnly")]
    public async Task<IActionResult> GetCompleted()
        => Ok(await _service.GetCompletedLessonIdsAsync());
}

