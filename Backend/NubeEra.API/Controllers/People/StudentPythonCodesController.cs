using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Services;

namespace NubeEra.API.Controllers.People;

[ApiController]
[Route("api/student-python-code")]
public class StudentPythonCodesController : ControllerBase
{
    private readonly IStudentPythonCodeService _service;

    public StudentPythonCodesController(IStudentPythonCodeService service)
    {
        _service = service;
    }

    [HttpGet("{lessonId}")]
    [Authorize(Policy = "StudentOnly")]
    public async Task<IActionResult> Get(Guid lessonId)
    {
        var code = await _service.GetCodeAsync(lessonId);
        return Ok(code);
    }

    [HttpPost]
    [Authorize(Policy = "StudentOnly")]
    public async Task<IActionResult> Save(StudentPythonCodeSaveDto dto)
    {
        await _service.SaveCodeAsync(dto);
        return Ok();
    }

    [HttpGet("student/{studentId}/lesson/{lessonId}")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> GetStudentCodeForTeacher(Guid studentId, Guid lessonId)
    {
        var code = await _service.GetStudentCodeForTeacherAsync(studentId, lessonId);
        return Ok(code);
    }

    [HttpGet("lesson/{lessonId}")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> GetSubmissionsForLesson(Guid lessonId)
    {
        var submissions = await _service.GetSubmissionsForLessonAsync(lessonId);
        return Ok(submissions);
    }
}
