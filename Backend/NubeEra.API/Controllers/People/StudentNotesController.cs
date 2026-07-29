using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Services;

namespace NubeEra.API.Controllers.People;

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

