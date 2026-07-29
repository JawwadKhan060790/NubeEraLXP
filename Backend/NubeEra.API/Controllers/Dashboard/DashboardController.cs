using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NubeEra.Application.Interfaces.Security;
using NubeEra.Application.Interfaces.Services;


namespace NubeEra.API.Controllers.Dashboard;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService   _dashboardService;
    private readonly ICurrentUserService _currentUserService;
    private readonly ITenantService      _tenantService;

    public DashboardController(IDashboardService dashboardService, ICurrentUserService currentUserService, ITenantService tenantService)
    {
        _dashboardService   = dashboardService;
        _currentUserService = currentUserService;
        _tenantService      = tenantService;
    }

    /// <summary>
    /// Get dashboard statistics. Accessible by Staff and above roles.
    /// </summary>
    [HttpGet("stats")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> GetStats([FromQuery] string? schoolFilter = null)
    {
        var stats = await _dashboardService.GetStatsAsync(_tenantService.GetEffectiveSchoolId(), schoolFilter);
        return Ok(stats);
    }

    /// <summary>
    /// Get student specific dashboard progress and stats.
    /// </summary>
    [HttpGet("student")]
    public async Task<IActionResult> GetStudentDashboard([FromQuery] string? subjectFilter = null)
    {
        // Prefer the direct StudentId claim (set by JwtTokenService from StudentProfile.Id).
        // Fall back to resolving by UserId for backwards-compat.
        var studentIdStr = User.FindFirst("StudentId")?.Value;
        var userIdStr    = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                           ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(studentIdStr) && string.IsNullOrEmpty(userIdStr))
            return Unauthorized();

        var studentId = !string.IsNullOrEmpty(studentIdStr) ? Guid.Parse(studentIdStr) : (Guid?)null;
        var userId    = !string.IsNullOrEmpty(userIdStr)    ? Guid.Parse(userIdStr)    : (Guid?)null;

        var dashboard = await _dashboardService.GetStudentDashboardAsync(userId, studentId, subjectFilter);

        // Previously this returned Ok(null) — HTTP 200 with an empty body — when no
        // Student profile could be resolved for the current user. The frontend then
        // tried to render fields straight off the null payload and crashed, which is
        // what QA saw as "the student dashboard is not showing". Return a real 404 so
        // the frontend can show an explicit empty-state instead of crashing.
        if (dashboard == null)
            return NotFound(new { message = "No student profile is linked to this account yet." });

        return Ok(dashboard);
    }

    /// <summary>
    /// Get teacher specific dashboard progress and stats.
    /// </summary>
    [HttpGet("teacher")]
    public async Task<IActionResult> GetTeacherDashboard([FromQuery] string? gradeFilter = null)
    {
        // Prefer the direct TeacherId claim (set by JwtTokenService from Teacher.Id — PK lookup).
        // Fall back to UserId for backwards-compat with older tokens.
        var teacherIdStr = User.FindFirst("TeacherId")?.Value;
        var userIdStr    = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                           ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(teacherIdStr) && string.IsNullOrEmpty(userIdStr))
            return Unauthorized();

        var teacherId = !string.IsNullOrEmpty(teacherIdStr) ? Guid.Parse(teacherIdStr) : (Guid?)null;
        var userId    = !string.IsNullOrEmpty(userIdStr)    ? Guid.Parse(userIdStr)    : (Guid?)null;

        var dashboard = await _dashboardService.GetTeacherDashboardAsync(userId, teacherId, gradeFilter);
        return Ok(dashboard);
    }
}

