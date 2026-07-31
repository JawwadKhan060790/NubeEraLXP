using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Veriton.Application.DTOs.Academic;
using Veriton.Application.Interfaces.Services;

namespace Veriton.API.Controllers.Academic;

[ApiController]
[Route("api/doubts")]
[Authorize]
public class DoubtsController : ControllerBase
{
    private readonly IStudentDoubtService _service;

    public DoubtsController(IStudentDoubtService service)
    {
        _service = service;
    }

    // ── Student: Raise a doubt ─────────────────────────────────────────────────

    [HttpPost]
    [Authorize(Policy = "StudentOnly")]
    public async Task<IActionResult> Raise([FromBody] StudentDoubtCreateDto dto)
    {
        try
        {
            var result = await _service.RaiseDoubtAsync(dto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // ── Student: My doubts list ────────────────────────────────────────────────

    [HttpGet("mine")]
    [Authorize(Policy = "StudentOnly")]
    public async Task<IActionResult> GetMyDoubts()
    {
        var doubts = await _service.GetMyDoubtsAsync();
        return Ok(doubts);
    }

    // ── Student: Lessons for their grade (for topic dropdown) ─────────────────

    [HttpGet("lessons-for-grade")]
    [Authorize(Policy = "StudentOnly")]
    public async Task<IActionResult> GetLessonsForGrade()
    {
        var lessons = await _service.GetLessonsForStudentGradeAsync();
        return Ok(lessons);
    }

    // ── Student: Delete own doubt ─────────────────────────────────────────────

    [HttpDelete("{id}")]
    [Authorize(Policy = "StudentOnly")]
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            await _service.DeleteAsync(id);
            return NoContent();
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // ── Teacher: Doubts from their grade students ─────────────────────────────

    [HttpGet("grade")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> GetGradeDoubts()
    {
        var doubts = await _service.GetGradeDoubtsAsync();
        return Ok(doubts);
    }

    // ── Teacher: Reply to a doubt ──────────────────────────────────────────────

    [HttpPut("{id}/reply")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> Reply(Guid id, [FromBody] StudentDoubtReplyDto dto)
    {
        try
        {
            await _service.ReplyAsync(id, dto);
            return Ok(new { message = "Reply submitted successfully." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // ── Teacher/Staff/Admin: Close a doubt ─────────────────────────────────────

    [HttpPut("{id}/close")]
    public async Task<IActionResult> Close(Guid id)
    {
        try
        {
            await _service.CloseAsync(id);
            return Ok(new { message = "Doubt closed." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // ── Shared: Get by ID ──────────────────────────────────────────────────────

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var doubt = await _service.GetDoubtByIdAsync(id);
        if (doubt == null) return NotFound();
        return Ok(doubt);
    }

    // ── Staff/Admin: All doubts with filters ─────────────────────────────────

    [HttpGet("all")]
    [Authorize(Policy = "StaffOnly")]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? schoolId,
        [FromQuery] Guid? gradeId,
        [FromQuery] Guid? sectionId,
        [FromQuery] string? status,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var filters = new StudentDoubtFilterDto
        {
            SchoolId  = schoolId,
            GradeId   = gradeId,
            SectionId = sectionId,
            Status    = status,
            Search    = search,
            Page      = page,
            PageSize  = pageSize
        };
        var (items, total) = await _service.GetAllDoubtsAsync(filters);
        return Ok(new { items, total, page, pageSize });
    }
}
