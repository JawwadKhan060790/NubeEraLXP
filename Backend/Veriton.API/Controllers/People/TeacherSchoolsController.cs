using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Veriton.Application.DTOs;
using Veriton.Application.Interfaces.Security;
using Veriton.Application.Interfaces.Services;
using Veriton.Domain.Constants;

namespace Veriton.API.Controllers.People;

/// <summary>
/// Multi-School Teacher Assignment (Requirement 2) and school-specific Teacher
/// access / post-login school switching (Requirement 3); also backs the Admin
/// Teacher-School Assignment screen (Requirement 7.2).
///
/// <see cref="GetMySchools"/> is the one self-service read meant to be called by
/// the Teacher themselves right after login to populate the school-switcher —
/// everything else here is an Admin/Staff/Principal administration action,
/// matching the same authorization tiers used by <see cref="TeachersController"/>.
/// </summary>
[ApiController]
[Route("api/teacher-schools")]
[Authorize]
public class TeacherSchoolsController : ControllerBase
{
    private readonly ITeacherSchoolService _service;
    private readonly ICurrentUserService   _currentUserService;

    public TeacherSchoolsController(ITeacherSchoolService service, ICurrentUserService currentUserService)
    {
        _service            = service;
        _currentUserService = currentUserService;
    }

    /// <summary>
    /// GET /api/teacher-schools/my-schools — active School memberships for the
    /// currently logged-in Teacher (Requirement 3: "show only assigned Schools;
    /// allow switching between schools if multiple"). Resolves the Teacher's own
    /// identity from the JWT, never trusts a client-supplied id.
    /// </summary>
    [HttpGet("my-schools")]
    [Authorize(Policy = AppPolicies.TeacherOnly)]
    public async Task<IActionResult> GetMySchools()
    {
        try
        {
            var teacherId = _currentUserService.TeacherId
                ?? throw new UnauthorizedAccessException("Teacher identity not found in token.");
            return Ok(await _service.GetAvailableSchoolsForLoginAsync(teacherId));
        }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
        catch (Exception                   ex) { return BadRequest(new   { message = ex.Message }); }
    }

    /// <summary>GET /api/teacher-schools/by-teacher/{teacherId} — full (active + inactive) membership list. Backs the Teacher Edit screen's multi-select.</summary>
    [HttpGet("by-teacher/{teacherId:guid}")]
    [Authorize(Policy = AppPolicies.PrincipalOnly)]
    public async Task<IActionResult> GetByTeacher(Guid teacherId)
    {
        try { return Ok(await _service.GetByTeacherAsync(teacherId)); }
        catch (KeyNotFoundException ex) { return NotFound(new   { message = ex.Message }); }
        catch (Exception            ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>GET /api/teacher-schools/available-for-login/{teacherId} — Admin-facing preview of a Teacher's active School memberships.</summary>
    [HttpGet("available-for-login/{teacherId:guid}")]
    [Authorize(Policy = AppPolicies.PrincipalOnly)]
    public async Task<IActionResult> GetAvailableSchoolsForLogin(Guid teacherId)
    {
        try { return Ok(await _service.GetAvailableSchoolsForLoginAsync(teacherId)); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>GET /api/teacher-schools/paged?teacherId=&amp;schoolId=&amp;isActive=&amp;search=&amp;page=&amp;pageSize= — paged grid for the Admin Teacher-School Assignment screen.</summary>
    [HttpGet("paged")]
    [Authorize(Policy = AppPolicies.StaffOnly)]
    public async Task<IActionResult> GetPaged([FromQuery] TeacherSchoolQueryDto query)
    {
        try { return Ok(await _service.GetPagedAsync(query)); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>GET /api/teacher-schools/audit-log?teacherId=&amp;schoolId=&amp;fromDate=&amp;toDate=&amp;page=&amp;pageSize= — assignment history.</summary>
    [HttpGet("audit-log")]
    [Authorize(Policy = AppPolicies.StaffOnly)]
    public async Task<IActionResult> GetAuditLog([FromQuery] TeacherSchoolAuditLogQueryDto query)
    {
        try { return Ok(await _service.GetAuditLogAsync(query)); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>POST /api/teacher-schools/sync — full-set sync used by the Teacher Create/Edit screen's multi-select (Admin/Staff only).</summary>
    [HttpPost("sync")]
    [Authorize(Policy = AppPolicies.StaffOnly)]
    public async Task<IActionResult> Sync([FromBody] TeacherSchoolAssignmentSetDto dto)
    {
        try
        {
            await _service.SyncTeacherSchoolsAsync(dto);
            return Ok(new { message = "Teacher school memberships synced successfully." });
        }
        catch (KeyNotFoundException      ex) { return NotFound(new  { message = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
        catch (Exception                 ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>POST /api/teacher-schools/assign — bulk-assign (or restore) one or more additional Schools to a Teacher. Used by the standalone Teacher-School Assignment screen.</summary>
    [HttpPost("assign")]
    [Authorize(Policy = AppPolicies.StaffOnly)]
    public async Task<IActionResult> Assign([FromBody] AssignTeacherToSchoolsDto dto)
    {
        try { return Ok(await _service.AssignToSchoolsAsync(dto)); }
        catch (KeyNotFoundException      ex) { return NotFound(new  { message = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
        catch (Exception                 ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>POST /api/teacher-schools/remove — soft-delete a single Teacher-School membership. Blocked for the Teacher's primary School or their last remaining membership.</summary>
    [HttpPost("remove")]
    [Authorize(Policy = AppPolicies.StaffOnly)]
    public async Task<IActionResult> Remove([FromBody] RemoveTeacherSchoolDto dto)
    {
        try
        {
            await _service.RemoveAsync(dto);
            return Ok(new { message = "Teacher-School assignment removed successfully." });
        }
        catch (KeyNotFoundException      ex) { return NotFound(new  { message = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
        catch (Exception                 ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>PUT /api/teacher-schools/{teacherId}/{schoolId}/status — toggle a membership's Active/Inactive business status. Blocked for the Teacher's primary School or their last remaining active membership.</summary>
    [HttpPut("{teacherId:guid}/{schoolId:guid}/status")]
    [Authorize(Policy = AppPolicies.StaffOnly)]
    public async Task<IActionResult> SetStatus(Guid teacherId, Guid schoolId, [FromBody] UpdateTeacherSchoolStatusDto dto)
    {
        try
        {
            await _service.SetStatusAsync(teacherId, schoolId, dto);
            return NoContent();
        }
        catch (KeyNotFoundException      ex) { return NotFound(new  { message = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
        catch (Exception                 ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>PUT /api/teacher-schools/set-primary — mark one of a Teacher's Schools as primary/home; mirrors onto Teacher.SchoolId and User.SchoolId (and thus the JWT).</summary>
    [HttpPut("set-primary")]
    [Authorize(Policy = AppPolicies.StaffOnly)]
    public async Task<IActionResult> SetPrimary([FromBody] SetPrimaryTeacherSchoolDto dto)
    {
        try
        {
            await _service.SetPrimaryAsync(dto);
            return NoContent();
        }
        catch (KeyNotFoundException      ex) { return NotFound(new  { message = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
        catch (Exception                 ex) { return BadRequest(new { message = ex.Message }); }
    }
}
