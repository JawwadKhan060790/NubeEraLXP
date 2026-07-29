using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using NubeEra.Application.Interfaces.Security;
using NubeEra.Application.Interfaces.Services;

namespace NubeEra.API.Controllers.Dashboard;

/// <summary>
/// Enterprise analytics endpoints — one call per role returns all KPIs + chart data.
/// All queries run in the database (no client-side aggregation).
/// </summary>
[ApiController]
[Route("api/analytics")]
[Authorize]
public class AnalyticsController : ControllerBase
{
    private readonly IAnalyticsService _analytics;
    private readonly ITenantService    _tenant;

    public AnalyticsController(IAnalyticsService analytics, ITenantService tenant)
    {
        _analytics = analytics;
        _tenant    = tenant;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Guid? CurrentUserId()
    {
        var val = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
               ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
        return Guid.TryParse(val, out var id) ? id : null;
    }

    private IActionResult NotLoggedIn() => Unauthorized(new { message = "User not authenticated." });

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/analytics/superadmin
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>Platform-wide KPIs and charts for SuperAdmin.</summary>
    [HttpGet("superadmin")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetSuperAdminAnalytics()
    {
        var result = await _analytics.GetSuperAdminAnalyticsAsync();
        return Ok(result);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/analytics/admin
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>School-scoped (or platform-wide when SuperAdmin) analytics for Admin.</summary>
    [HttpGet("admin")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> GetAdminAnalytics()
    {
        var schoolId = _tenant.GetEffectiveSchoolId();
        var result   = await _analytics.GetAdminAnalyticsAsync(schoolId);
        return Ok(result);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/analytics/principal
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>School analytics for Principal (school must be in JWT).</summary>
    [HttpGet("principal")]
    [Authorize(Roles = "Principal")]
    public async Task<IActionResult> GetPrincipalAnalytics()
    {
        var schoolId = _tenant.GetEffectiveSchoolId();
        if (schoolId == null)
            return BadRequest(new { message = "School context is required for Principal analytics." });

        var result = await _analytics.GetPrincipalAnalyticsAsync(schoolId.Value);
        return Ok(result);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/analytics/teacher
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>Teacher's own class analytics (modules, students, exams).</summary>
    [HttpGet("teacher")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> GetTeacherAnalytics()
    {
        var userId   = CurrentUserId();
        var schoolId = _tenant.GetEffectiveSchoolId();
        if (userId == null)   return NotLoggedIn();
        if (schoolId == null) return BadRequest(new { message = "School context is required." });

        var result = await _analytics.GetTeacherAnalyticsAsync(userId.Value, schoolId.Value);
        return Ok(result);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/analytics/student
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>Student's own performance, attendance, and learning progress.</summary>
    [HttpGet("student")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> GetStudentAnalytics()
    {
        var userId       = CurrentUserId();
        var studentIdStr = User.FindFirst("StudentId")?.Value;
        var schoolId     = _tenant.GetEffectiveSchoolId();

        if (userId == null && string.IsNullOrEmpty(studentIdStr)) return NotLoggedIn();
        if (schoolId == null) return BadRequest(new { message = "School context is required." });

        var studentId = Guid.TryParse(studentIdStr, out var sid) ? sid : (Guid?)null;
        var result    = await _analytics.GetStudentAnalyticsAsync(userId, studentId, schoolId.Value);
        return Ok(result);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/analytics/parent/{studentId}
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>Parent view: child's academic progress and attendance.</summary>
    [HttpGet("parent/{studentId:guid}")]
    [Authorize(Roles = "Parent")]
    public async Task<IActionResult> GetParentAnalytics(Guid studentId)
    {
        var result = await _analytics.GetParentAnalyticsAsync(studentId, null);
        return Ok(result);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/analytics/staff
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>Staff operations analytics: tickets, admissions, certs, events.</summary>
    [HttpGet("staff")]
    [Authorize(Roles = "Staff,Admin,SuperAdmin")]
    public async Task<IActionResult> GetStaffAnalytics()
    {
        var schoolId = _tenant.GetEffectiveSchoolId();
        var result   = await _analytics.GetStaffAnalyticsAsync(schoolId);
        return Ok(result);
    }
}
