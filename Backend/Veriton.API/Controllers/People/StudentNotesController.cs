using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Veriton.Application.DTOs;
using Veriton.Application.Interfaces.Services;

namespace Veriton.API.Controllers.People;

[ApiController]
[Route("api/student-notes")]
[Authorize(Policy = "StudentOnly")]
public class StudentNotesController : ControllerBase
{
    private readonly IStudentNoteService _service;

    public StudentNotesController(IStudentNoteService service)
    {
        _service = service;
    }

    [HttpGet("{lessonId}")]
    public async Task<IActionResult> Get(Guid lessonId)
    {
        var note = await _service.GetNoteAsync(lessonId);
        return Ok(note);
    }

    [HttpPost]
    public async Task<IActionResult> Save(StudentNoteSaveDto dto)
    {
        await _service.SaveNoteAsync(dto);
        return Ok();
    }
}

