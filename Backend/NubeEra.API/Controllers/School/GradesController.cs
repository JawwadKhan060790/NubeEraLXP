using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NubeEra.Application.Common.Export;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Services;
using NubeEra.Application.Interfaces.Services.Export;
using NubeEra.Domain.Common;

namespace NubeEra.API.Controllers.School;

[ApiController]
[Route("api/grades")]
[Authorize]
public class GradesController : ControllerBase
{
    private readonly IGradeService _service;
    private readonly IExcelExportService _excelExportService;

    private static readonly IReadOnlyList<ExportColumnDefinition> GradeExportColumns = new List<ExportColumnDefinition>
    {
        ExportColumnDefinition.Text("grade_name", "Grade Name", 22),
        ExportColumnDefinition.Text("grade_level", "Level", 12),
        ExportColumnDefinition.Text("school_name", "School", 28),
        ExportColumnDefinition.Text("class_teacher_name", "Class Teacher", 26),
        ExportColumnDefinition.Text("class_room", "Classroom", 16),
        ExportColumnDefinition.Text("academic_year", "Academic Year", 16),
        ExportColumnDefinition.Number("capacity", "Capacity", 12),
        ExportColumnDefinition.Number("student_count", "Students", 12),
        ExportColumnDefinition.Boolean("is_active", "Active", 10),
    };

    public GradesController(IGradeService service, IExcelExportService excelExportService)
    {
        _service = service;
        _excelExportService = excelExportService;
    }

    [HttpGet]
    [Authorize(Roles = AppRoles.AllRoles)]
    public async Task<IActionResult> GetAll()
        => Ok(await _service.GetAllAsync());

    [HttpGet("export")]
    [Authorize(Roles = AppRoles.AllRoles)]
    public async Task<IActionResult> Export()
    {
        var grades = await _service.GetAllAsync();
        var rows = grades.Select(g => (IReadOnlyDictionary<string, object?>)new Dictionary<string, object?>
        {
            ["grade_name"] = g.GradeName,
            ["grade_level"] = g.GradeLevel,
            ["school_name"] = g.SchoolName,
            ["class_teacher_name"] = g.ClassTeacherName,
            ["class_room"] = g.ClassRoom,
            ["academic_year"] = g.AcademicYear,
            ["capacity"] = (object?)g.Capacity,
            ["student_count"] = (object?)g.StudentCount,
            ["is_active"] = g.IsActive,
        }).ToList();
        var configuration = ExportConfiguration.Create(
            fileName: $"grades-export-{DateTime.UtcNow:yyyyMMdd-HHmmss}",
            sheetName: "Grades",
            columns: GradeExportColumns,
            title: "Grade Configuration");
        var fileBytes = _excelExportService.GenerateExcel(rows, configuration);
        return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"{configuration.FileName}.xlsx");
    }

    /// <summary>Returns all grades for a specific school, filtered to that school's grade range.</summary>
    [HttpGet("by-school/{schoolId}")]
    [Authorize(Roles = AppRoles.AllRoles)]
    public async Task<IActionResult> GetBySchool(Guid schoolId)
        => Ok(await _service.GetBySchoolAsync(schoolId));

    /// <summary>Returns grades accessible to the current user based on role and school context.</summary>
    [HttpGet("accessible")]
    [Authorize(Roles = AppRoles.AllRoles)]
    public async Task<IActionResult> GetAccessible()
        => Ok(await _service.GetAccessibleAsync());

    [HttpGet("{id}")]
    [Authorize(Roles = AppRoles.AllRoles)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var grade = await _service.GetByIdAsync(id);
        return grade == null ? NotFound() : Ok(grade);
    }

    [HttpPost]
    [Authorize(Policy = "PrincipalOnly")]  // Staff and above can create grades
    public async Task<IActionResult> Create(GradeCreateDto dto)
        => Ok(new { id = await _service.CreateAsync(dto) });

    [HttpPut("{id}")]
    [Authorize(Policy = "PrincipalOnly")]
    public async Task<IActionResult> Update(Guid id, GradeUpdateDto dto)
    {
        await _service.UpdateAsync(id, dto);
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "PrincipalOnly")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }
}
