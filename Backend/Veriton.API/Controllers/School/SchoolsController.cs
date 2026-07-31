using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Veriton.Application.Common.Export;
using Veriton.Application.DTOs;
using Veriton.Application.Interfaces.Services;
using Veriton.Application.Interfaces.Services.Export;
using Veriton.Domain.Common;

namespace Veriton.API.Controllers.School;

[ApiController]
[Route("api/schools")]
[Authorize]
public class SchoolsController : ControllerBase
{
    private readonly IGenericService<SchoolCreateDto, SchoolUpdateDto, SchoolDto> _service;
    private readonly IExcelExportService _excelExportService;
    private readonly ILogger<SchoolsController> _logger;

    // Declarative column map for the Schools Excel export — mirrors the pattern
    // established in TeachersController.TeacherExportColumns. Same shared
    // IExcelExportService does the actual rendering.
    private static readonly IReadOnlyList<ExportColumnDefinition> SchoolExportColumns = new List<ExportColumnDefinition>
    {
        ExportColumnDefinition.Text("name", "School Name", 32),
        ExportColumnDefinition.Text("school_code", "School Code", 16),
        ExportColumnDefinition.Text("principal_name", "Principal Name", 26),
        ExportColumnDefinition.Text("contact_email", "Contact Email", 30),
        ExportColumnDefinition.Text("contact_phone", "Contact Phone", 16),
        ExportColumnDefinition.Text("address", "Address", 36),
        ExportColumnDefinition.Boolean("is_active", "Active", 10),
        ExportColumnDefinition.Text("grade_range", "Grade Range", 22),
    };

    public SchoolsController(
        IGenericService<SchoolCreateDto, SchoolUpdateDto, SchoolDto> service,
        IExcelExportService excelExportService,
        ILogger<SchoolsController> logger)
    {
        _service = service;
        _excelExportService = excelExportService;
        _logger = logger;
    }

    [HttpGet]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> GetAll()
        => Ok(await _service.GetAllAsync());

    /// <summary>
    /// Export the school directory to Excel (.xlsx). Reuses the same shared
    /// IExcelExportService framework as Students/Teachers. Authorization tier
    /// matches the list endpoint (TeacherOnly) — export never exposes more than
    /// the screen already shows.
    /// </summary>
    [HttpGet("export")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> Export()
    {
        var schools = await _service.GetAllAsync();

        var rows = schools.Select(s => (IReadOnlyDictionary<string, object?>)new Dictionary<string, object?>
        {
            ["name"] = s.Name,
            ["school_code"] = s.SchoolCode,
            ["principal_name"] = s.PrincipalName,
            ["contact_email"] = s.ContactEmail,
            ["contact_phone"] = s.ContactPhone,
            ["address"] = s.Address,
            ["is_active"] = s.IsActive,
            ["grade_range"] = s.HasValidGradeRange
                ? $"{s.FromGradeName} – {s.ToGradeName}"
                : "Not configured",
        }).ToList();

        var configuration = ExportConfiguration.Create(
            fileName: $"schools-export-{DateTime.UtcNow:yyyyMMdd-HHmmss}",
            sheetName: "Schools",
            columns: SchoolExportColumns,
            title: "School Directory");

        var fileBytes = _excelExportService.GenerateExcel(rows, configuration);
        return File(
            fileBytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"{configuration.FileName}.xlsx");
    }

    [HttpGet("{id}")]
    [Authorize(Policy = "PrincipalOnly")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var school = await _service.GetByIdAsync(id);
        return school == null ? NotFound() : Ok(school);
    }

    [HttpPost]
    [Authorize(Policy = "PrincipalOnly")]
    public async Task<IActionResult> Create(SchoolCreateDto dto)
    {
        try
        {
            var id = await _service.CreateAsync(dto);
            return Ok(new { id });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create school");
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "PrincipalOnly")]
    public async Task<IActionResult> Update(Guid id, SchoolUpdateDto dto)
    {
        try
        {
            await _service.UpdateAsync(id, dto);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update school {Id}", id);
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "PrincipalOnly")]
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            await _service.DeleteAsync(id);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete school {Id}", id);
            return BadRequest(new { message = ex.Message });
        }
    }
}

