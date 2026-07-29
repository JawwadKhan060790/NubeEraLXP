using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Services;
using NubeEra.Domain.Common;
using NubeEra.Domain.Constants;

namespace NubeEra.API.Controllers.School;

/// <summary>
/// Grade Section Management — School → Grade → Section hierarchy.
/// Admin/Staff create and manage sections; Teachers/Students get read-only access
/// for their own school's sections.
/// </summary>
[ApiController]
[Route("api/grade-sections")]
[Authorize]
public class GradeSectionsController : ControllerBase
{
    private readonly IGradeSectionService _service;

    public GradeSectionsController(IGradeSectionService service)
    {
        _service = service;
    }

    /// <summary>GET /api/grade-sections — All sections (scoped by tenant filter).</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        try { return Ok(await _service.GetAllAsync()); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>GET /api/grade-sections/by-grade/{gradeId} — Sections for a specific grade.</summary>
    [HttpGet("by-grade/{gradeId:guid}")]
    public async Task<IActionResult> GetByGrade(Guid gradeId)
    {
        try { return Ok(await _service.GetByGradeAsync(gradeId)); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>GET /api/grade-sections/by-school/{schoolId}?gradeId= — Sections for a school.</summary>
    [HttpGet("by-school/{schoolId:guid}")]
    public async Task<IActionResult> GetBySchool(Guid schoolId, [FromQuery] Guid? gradeId = null)
    {
        try { return Ok(await _service.GetBySchoolAsync(schoolId, gradeId)); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>GET /api/grade-sections/{id}</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        try
        {
            var dto = await _service.GetByIdAsync(id);
            return dto == null ? NotFound() : Ok(dto);
        }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>POST /api/grade-sections — Create a new section (Admin/Staff only).</summary>
    [HttpPost]
    [Authorize(Policy = AppPolicies.StaffOnly)]
    public async Task<IActionResult> Create([FromBody] GradeSectionCreateDto dto)
    {
        try
        {
            var id = await _service.CreateAsync(dto);
            return Ok(new { id, message = $"Division '{dto.SectionCode}' created successfully." });
        }
        catch (KeyNotFoundException  ex) { return NotFound(new   { message = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
        catch (GradeAccessForbiddenException ex) { return StatusCode(403, new { message = ex.Message }); }
        catch (Exception             ex) { return BadRequest(new  { message = ex.Message }); }
    }

    /// <summary>PUT /api/grade-sections/{id} — Update a section (Admin/Staff only).</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = AppPolicies.StaffOnly)]
    public async Task<IActionResult> Update(Guid id, [FromBody] GradeSectionUpdateDto dto)
    {
        try
        {
            await _service.UpdateAsync(id, dto);
            return NoContent();
        }
        catch (KeyNotFoundException ex) { return NotFound(new  { message = ex.Message }); }
        catch (Exception           ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>DELETE /api/grade-sections/{id} — Soft-delete a section (Admin/Staff only).</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = AppPolicies.StaffOnly)]
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            await _service.DeleteAsync(id);
            return NoContent();
        }
        catch (KeyNotFoundException ex) { return NotFound(new  { message = ex.Message }); }
        catch (Exception           ex) { return BadRequest(new { message = ex.Message }); }
    }
}
