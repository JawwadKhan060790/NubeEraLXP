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
[Route("api/modules")]
[Authorize]
public class ModulesController : ControllerBase
{
    private readonly IModuleService _service;
    private readonly IExcelExportService _excelExportService;
    private readonly ILogger<ModulesController> _logger;

    // Units are school-agnostic master content keyed by grade level — no School
    // column here; per-school assignment is managed separately via
    // /admin/curriculum-assignment.
    private static readonly IReadOnlyList<ExportColumnDefinition> ModuleExportColumns = new List<ExportColumnDefinition>
    {
        ExportColumnDefinition.Text("name", "Unit Name", 30),
        ExportColumnDefinition.Text("grade_level_name", "Grade Level", 20),
        ExportColumnDefinition.Text("description", "Description", 40),
        ExportColumnDefinition.Number("credits", "Credits", 10),
        ExportColumnDefinition.Text("created_by_teacher_name", "Created By", 24),
        ExportColumnDefinition.Number("lesson_count", "Lessons", 12),
        ExportColumnDefinition.Number("exam_count", "Exams", 10),
        ExportColumnDefinition.Boolean("is_active", "Active", 10),
    };

    public ModulesController(
        IModuleService service,
        IExcelExportService excelExportService,
        ILogger<ModulesController> logger)
    {
        _service = service;
        _excelExportService = excelExportService;
        _logger = logger;
    }

    /// <summary>
    /// Get all modules (non-paginated). Kept for backward compatibility.
    /// Prefer GET /api/modules/paged for large datasets.
    /// </summary>
    [HttpGet]
    [Authorize(Policy = "StudentOnly")]
    public async Task<IActionResult> GetAll()
        => Ok(await _service.GetAllAsync());

    [HttpGet("export")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> Export()
    {
        var modules = await _service.GetAllAsync();
        var rows = modules.Select(m => (IReadOnlyDictionary<string, object?>)new Dictionary<string, object?>
        {
            ["name"] = m.Name,
            ["grade_level_name"] = m.GradeLevelName,
            ["description"] = m.Description,
            ["credits"] = (object?)m.Credits,
            ["created_by_teacher_name"] = m.CreatedByTeacherName,
            ["lesson_count"] = (object?)m.LessonCount,
            ["exam_count"] = (object?)m.ExamCount,
            ["is_active"] = m.IsActive,
        }).ToList();
        var configuration = ExportConfiguration.Create(
            fileName: $"modules-export-{DateTime.UtcNow:yyyyMMdd-HHmmss}",
            sheetName: "Modules",
            columns: ModuleExportColumns,
            title: "Units & Syllabus");
        var fileBytes = _excelExportService.GenerateExcel(rows, configuration);
        return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"{configuration.FileName}.xlsx");
    }

    /// <summary>
    /// Server-side paginated modules. Supports search, grade filter, sorting.
    /// Query params: pageNumber, pageSize, search, gradeId, sortBy, sortDirection
    /// </summary>
    [HttpGet("paged")]
    [Authorize(Policy = "StudentOnly")]
    public async Task<IActionResult> GetPaged([FromQuery] PaginationRequest request)
        => Ok(await _service.GetPagedAsync(request));

    [HttpGet("{id}")]
    [Authorize(Policy = "StudentOnly")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var module = await _service.GetByIdAsync(id);
        return module == null ? NotFound() : Ok(module);
    }

    [HttpPost]
    [Authorize(Policy = "TeacherOnly")]  // Teachers and above can manage curriculum units
    public async Task<IActionResult> Create(ModuleCreateDto dto)
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
            _logger.LogError(ex, "Error creating module");
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> Update(Guid id, ModuleUpdateDto dto)
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
            _logger.LogError(ex, "Error updating module {Id}", id);
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
            _logger.LogError(ex, "Error deleting module {Id}", id);
            return BadRequest(new { message = ex.Message });
        }
    }
}
