using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Security;
using NubeEra.Application.Interfaces.Services;
using NubeEra.Domain.Constants;

namespace NubeEra.API.Controllers.TeacherSpace;

/// <summary>
/// Student Weakness Analysis — per-student and grade-level topic weakness tracking.
/// </summary>
[ApiController]
[Route("api/teacher/student-weakness")]
[Authorize(Policy = AppPolicies.TeacherOnly)]
public class StudentWeakTopicController : ControllerBase
{
    private readonly IStudentWeakTopicService _service;
    private readonly ICurrentUserService      _currentUserService;

    public StudentWeakTopicController(
        IStudentWeakTopicService service,
        ICurrentUserService      currentUserService)
    {
        _service            = service;
        _currentUserService = currentUserService;
    }

    /// <summary>GET /api/teacher/student-weakness/student/{studentId}</summary>
    [HttpGet("student/{studentId:guid}")]
    public async Task<IActionResult> GetStudentWeakness(Guid studentId)
    {
        try   { return Ok(await _service.GetStudentWeaknessAsync(studentId)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    /// <summary>GET /api/teacher/student-weakness/grade/{gradeId}</summary>
    [HttpGet("grade/{gradeId:guid}")]
    public async Task<IActionResult> GetGradeWeakness(Guid gradeId)
    {
        try   { return Ok(await _service.GetGradeWeaknessAsync(gradeId)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    /// <summary>POST /api/teacher/student-weakness — Manually create a weakness record.</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateStudentWeakTopicDto dto)
    {
        try
        {
            var id = await _service.CreateAsync(dto);
            return Ok(new { id });
        }
        catch (KeyNotFoundException ex) { return NotFound(new  { message = ex.Message }); }
        catch (ArgumentException    ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>PUT /api/teacher/student-weakness/{id}/resolve — Mark weakness as resolved.</summary>
    [HttpPut("{id:guid}/resolve")]
    public async Task<IActionResult> Resolve(Guid id)
    {
        try
        {
            await _service.ResolveAsync(id);
            return NoContent();
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    /// <summary>
    /// POST /api/teacher/student-weakness/sync-from-results/{gradeId}
    /// Auto-generates weakness records from exam results for a grade.
    /// </summary>
    [HttpPost("sync-from-results/{gradeId:guid}")]
    public async Task<IActionResult> SyncFromResults(Guid gradeId)
    {
        try
        {
            var schoolId = _currentUserService.SchoolId
                ?? throw new UnauthorizedAccessException("School not found in token.");
            await _service.SyncFromResultsAsync(gradeId, schoolId);
            return Ok(new { message = "Weakness records synced from exam results." });
        }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
        catch (Exception                   ex) { return BadRequest(new   { message = ex.Message }); }
    }
}
