using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Veriton.Application.DTOs;
using Veriton.Application.Interfaces.Services;
using Veriton.Application.Pagination;
using Veriton.Domain.Common;

namespace Veriton.API.Controllers.Academic;

[ApiController]
[Route("api/subjects")]
[Authorize]
public class SubjectsController : ControllerBase
{
    private readonly ISubjectService _service;
    private readonly ILogger<SubjectsController> _logger;

    public SubjectsController(
        ISubjectService service,
        ILogger<SubjectsController> logger)
    {
        _service = service;
        _logger = logger;
    }

    [HttpGet]
    [Authorize(Policy = "StudentOnly")]
    public async Task<IActionResult> GetAll()
        => Ok(await _service.GetAllAsync());

    [HttpGet("paged")]
    [Authorize(Policy = "StudentOnly")]
    public async Task<IActionResult> GetPaged([FromQuery] PaginationRequest request)
        => Ok(await _service.GetPagedAsync(request));

    [HttpGet("{id}")]
    [Authorize(Policy = "StudentOnly")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var subject = await _service.GetByIdAsync(id);
        return subject == null ? NotFound() : Ok(subject);
    }

    [HttpPost]
    [Authorize(Policy = "PrincipalOnly")]
    public async Task<IActionResult> Create(SubjectCreateDto dto)
    {
        try
        {
            var id = await _service.CreateAsync(dto);
            return Ok(new { id });
        }
        catch (AppException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating subject");
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "PrincipalOnly")]
    public async Task<IActionResult> Update(Guid id, SubjectUpdateDto dto)
    {
        try
        {
            await _service.UpdateAsync(id, dto);
            return NoContent();
        }
        catch (AppException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating subject {Id}", id);
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
            _logger.LogError(ex, "Error deleting subject {Id}", id);
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/assign-teachers")]
    [Authorize(Policy = "PrincipalOnly")]
    public async Task<IActionResult> AssignTeachers(Guid id, AssignSubjectPeopleDto dto)
    {
        try
        {
            await _service.AssignTeachersAsync(id, dto.PeopleIds);
            return Ok(new { message = "Teachers assigned successfully." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error assigning teachers to subject {Id}", id);
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/assign-students")]
    [Authorize(Policy = "PrincipalOnly")]
    public async Task<IActionResult> AssignStudents(Guid id, AssignSubjectPeopleDto dto)
    {
        try
        {
            await _service.AssignStudentsAsync(id, dto.PeopleIds);
            return Ok(new { message = "Students assigned successfully." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error assigning students to subject {Id}", id);
            return BadRequest(new { message = ex.Message });
        }
    }
}
