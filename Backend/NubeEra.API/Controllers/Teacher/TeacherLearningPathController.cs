using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Security;
using NubeEra.Application.Interfaces.Services;
using NubeEra.Domain.Constants;

namespace NubeEra.API.Controllers.TeacherSpace;

/// <summary>
/// Teacher Learning Path — grade-wise topic progress and syllabus completion.
/// </summary>
[ApiController]
[Route("api/teacher/learning-path")]
[Authorize(Policy = AppPolicies.TeacherOnly)]
public class TeacherLearningPathController : ControllerBase
{
    private readonly ITeacherLearningPathService _service;
    private readonly ICurrentUserService         _currentUserService;

    public TeacherLearningPathController(
        ITeacherLearningPathService service,
        ICurrentUserService         currentUserService)
    {
        _service            = service;
        _currentUserService = currentUserService;
    }

    // ── Resolve teacherId from JWT (teacher sees own data; admins pass explicit id) ──

    private Guid ResolveTeacherId(Guid? requestedId = null)
    {
        if (requestedId.HasValue && requestedId != Guid.Empty &&
            (_currentUserService.Role?.Equals("Teacher", StringComparison.OrdinalIgnoreCase) == false))
            return requestedId.Value;

        return _currentUserService.TeacherId
            ?? throw new UnauthorizedAccessException("Teacher identity not found in token.");
    }

    /// <summary>GET /api/teacher/learning-path — All-grade learning path for logged-in teacher.</summary>
    [HttpGet]
    public async Task<IActionResult> GetLearningPath([FromQuery] Guid? teacherId = null)
    {
        try
        {
            var tid = ResolveTeacherId(teacherId);
            return Ok(await _service.GetLearningPathAsync(tid));
        }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
        catch (KeyNotFoundException      ex) { return NotFound(new    { message = ex.Message }); }
    }

    /// <summary>GET /api/teacher/learning-path/{gradeId} — Grade-specific learning path.</summary>
    [HttpGet("{gradeId:guid}")]
    public async Task<IActionResult> GetByGrade(Guid gradeId, [FromQuery] Guid? sectionId = null, [FromQuery] Guid? teacherId = null)
    {
        try
        {
            var tid = ResolveTeacherId(teacherId);
            return Ok(await _service.GetLearningPathByGradeAsync(tid, gradeId, sectionId));
        }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
        catch (KeyNotFoundException      ex) { return NotFound(new    { message = ex.Message }); }
    }

    /// <summary>PUT /api/teacher/learning-path/topic-status — Update topic status.</summary>
    [HttpPut("topic-status")]
    public async Task<IActionResult> UpdateTopicStatus(
        [FromBody] UpdateTeacherTopicStatusDto dto,
        [FromQuery] Guid? teacherId = null)
    {
        try
        {
            var tid = ResolveTeacherId(teacherId);
            await _service.UpdateTopicStatusAsync(tid, dto);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
        catch (KeyNotFoundException      ex) { return NotFound(new    { message = ex.Message }); }
        catch (ArgumentException         ex) { return BadRequest(new  { message = ex.Message }); }
    }

    /// <summary>GET /api/teacher/learning-path/syllabus-completion — Syllabus completion metrics.</summary>
    [HttpGet("syllabus-completion")]
    public async Task<IActionResult> GetSyllabusCompletion([FromQuery] Guid? teacherId = null)
    {
        try
        {
            var tid = ResolveTeacherId(teacherId);
            return Ok(await _service.GetSyllabusCompletionAsync(tid));
        }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
        catch (KeyNotFoundException      ex) { return NotFound(new    { message = ex.Message }); }
    }

    /// <summary>GET /api/teacher/learning-path/grade-students/{gradeId} — Grade-wise student list.</summary>
    [HttpGet("grade-students/{gradeId:guid}")]
    public async Task<IActionResult> GetGradeStudents(Guid gradeId, [FromQuery] Guid? teacherId = null)
    {
        try
        {
            var tid = ResolveTeacherId(teacherId);
            return Ok(await _service.GetGradeStudentListAsync(tid, gradeId));
        }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
        catch (KeyNotFoundException      ex) { return NotFound(new    { message = ex.Message }); }
    }

    /// <summary>GET /api/teacher/learning-path/enhanced-dashboard — Enhanced teacher dashboard KPIs.</summary>
    [HttpGet("enhanced-dashboard")]
    public async Task<IActionResult> GetEnhancedDashboard([FromQuery] Guid? teacherId = null)
    {
        try
        {
            var tid = ResolveTeacherId(teacherId);
            return Ok(await _service.GetEnhancedDashboardAsync(tid));
        }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
        catch (KeyNotFoundException      ex) { return NotFound(new    { message = ex.Message }); }
    }
}
