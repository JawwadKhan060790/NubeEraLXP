using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Repositories;
using NubeEra.Application.Interfaces.Security;
using NubeEra.Application.Interfaces.Services;
using NubeEra.Domain.Constants;
using NubeEra.Domain.Entities;

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
    private readonly IGenericRepository<Teacher> _teacherRepo;

    public TeacherLearningPathController(
        ITeacherLearningPathService service,
        ICurrentUserService         currentUserService,
        IGenericRepository<Teacher> teacherRepo)
    {
        _service            = service;
        _currentUserService = currentUserService;
        _teacherRepo        = teacherRepo;
    }

    // ── Resolve teacherId from JWT or fallback for Admin/Staff ──

    private async Task<Guid?> ResolveTeacherIdAsync(Guid? requestedId = null)
    {
        if (requestedId.HasValue && requestedId != Guid.Empty &&
            (_currentUserService.Role?.Equals("Teacher", StringComparison.OrdinalIgnoreCase) == false))
            return requestedId.Value;

        if (_currentUserService.TeacherId.HasValue && _currentUserService.TeacherId.Value != Guid.Empty)
            return _currentUserService.TeacherId.Value;

        // Fallback for Admin/Staff/Principal who didn't pass a specific teacherId:
        var schoolId = _currentUserService.SchoolId;
        var query = _teacherRepo.Query().Where(t => t.IsActive);
        if (schoolId.HasValue && schoolId.Value != Guid.Empty)
            query = query.Where(t => t.SchoolId == schoolId.Value);

        var fallbackTeacher = await query.FirstOrDefaultAsync();
        if (fallbackTeacher != null) return fallbackTeacher.Id;

        var anyTeacher = await _teacherRepo.Query().FirstOrDefaultAsync();
        return anyTeacher?.Id;
    }

    /// <summary>GET /api/teacher/learning-path — All-grade learning path for teacher or Admin filter.</summary>
    [HttpGet]
    public async Task<IActionResult> GetLearningPath([FromQuery] Guid? teacherId = null)
    {
        try
        {
            var tid = await ResolveTeacherIdAsync(teacherId);
            if (!tid.HasValue || tid.Value == Guid.Empty)
                return Ok(new List<TeacherLearningPathDto>());

            return Ok(await _service.GetLearningPathAsync(tid.Value));
        }
        catch (KeyNotFoundException) { return Ok(new List<TeacherLearningPathDto>()); }
        catch (Exception ex) { return Ok(new List<TeacherLearningPathDto>()); }
    }

    /// <summary>GET /api/teacher/learning-path/{gradeId} — Grade-specific learning path.</summary>
    [HttpGet("{gradeId:guid}")]
    public async Task<IActionResult> GetByGrade(Guid gradeId, [FromQuery] Guid? sectionId = null, [FromQuery] Guid? teacherId = null)
    {
        try
        {
            var tid = await ResolveTeacherIdAsync(teacherId);
            if (!tid.HasValue || tid.Value == Guid.Empty)
                return Ok(null);

            return Ok(await _service.GetLearningPathByGradeAsync(tid.Value, gradeId, sectionId));
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (Exception ex) { return Ok(null); }
    }

    /// <summary>PUT /api/teacher/learning-path/topic-status — Update topic status.</summary>
    [HttpPut("topic-status")]
    public async Task<IActionResult> UpdateTopicStatus(
        [FromBody] UpdateTeacherTopicStatusDto dto,
        [FromQuery] Guid? teacherId = null)
    {
        try
        {
            var tid = await ResolveTeacherIdAsync(teacherId);
            if (!tid.HasValue || tid.Value == Guid.Empty)
                return BadRequest(new { message = "No valid teacher context specified for topic update." });

            await _service.UpdateTopicStatusAsync(tid.Value, dto);
            return NoContent();
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (ArgumentException    ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>GET /api/teacher/learning-path/syllabus-completion — Syllabus completion metrics.</summary>
    [HttpGet("syllabus-completion")]
    public async Task<IActionResult> GetSyllabusCompletion([FromQuery] Guid? teacherId = null)
    {
        try
        {
            var tid = await ResolveTeacherIdAsync(teacherId);
            if (!tid.HasValue || tid.Value == Guid.Empty)
                return Ok(new TeacherSyllabusCompletionDto());

            return Ok(await _service.GetSyllabusCompletionAsync(tid.Value));
        }
        catch (KeyNotFoundException) { return Ok(new TeacherSyllabusCompletionDto()); }
        catch (Exception) { return Ok(new TeacherSyllabusCompletionDto()); }
    }

    /// <summary>GET /api/teacher/learning-path/grade-students/{gradeId} — Grade-wise student list.</summary>
    [HttpGet("grade-students/{gradeId:guid}")]
    public async Task<IActionResult> GetGradeStudents(Guid gradeId, [FromQuery] Guid? sectionId = null, [FromQuery] Guid? teacherId = null)
    {
        try
        {
            var tid = await ResolveTeacherIdAsync(teacherId);
            if (!tid.HasValue || tid.Value == Guid.Empty)
                return Ok(null);

            return Ok(await _service.GetGradeStudentListAsync(tid.Value, gradeId, sectionId));
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    /// <summary>GET /api/teacher/learning-path/enhanced-dashboard — Enhanced teacher dashboard KPIs.</summary>
    [HttpGet("enhanced-dashboard")]
    public async Task<IActionResult> GetEnhancedDashboard([FromQuery] Guid? teacherId = null)
    {
        try
        {
            var tid = await ResolveTeacherIdAsync(teacherId);
            if (!tid.HasValue || tid.Value == Guid.Empty)
                return Ok(null);

            return Ok(await _service.GetEnhancedDashboardAsync(tid.Value));
        }
        catch (KeyNotFoundException ex) { return Ok(null); }
    }
}
