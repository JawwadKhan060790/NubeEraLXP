using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Veriton.Application.DTOs;
using Veriton.Application.Interfaces.Services;
using Veriton.Domain.Constants;

namespace Veriton.API.Controllers.Curriculum;

/// <summary>
/// School-Based Curriculum Assignment (Requirement 1), the write side of
/// Requirement 4's school-level visibility (the EF Core global query filters
/// already enforce the read side; this controller exposes the service that
/// populates the join tables those filters key off of), and Requirement 7.1/7.3
/// (Admin Curriculum Assignment screen + School Curriculum Dashboard).
///
/// Every action here is Admin/Staff-only — Schools never assign their own
/// curriculum; only a central Admin/Staff user assigns master Units/Topics to
/// one or more Schools.
/// </summary>
[ApiController]
[Route("api/school-curriculum")]
[Authorize]
public class SchoolCurriculumController : ControllerBase
{
    private readonly ISchoolCurriculumAssignmentService _service;

    public SchoolCurriculumController(ISchoolCurriculumAssignmentService service)
    {
        _service = service;
    }

    /// <summary>GET /api/school-curriculum/catalog?schoolId=&amp;entityType=&amp;unitId=&amp;assignedOnly=&amp;search=&amp;page=&amp;pageSize= — combined Unit+Topic catalog with assigned/unassigned flag for one School.</summary>
    [HttpGet("catalog")]
    [Authorize(Policy = AppPolicies.StaffOnly)]
    public async Task<IActionResult> GetCatalog([FromQuery] SchoolCurriculumCatalogQueryDto query)
    {
        try { return Ok(await _service.GetCatalogAsync(query)); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>GET /api/school-curriculum/{schoolId}/units — all Units currently assigned to a School.</summary>
    [HttpGet("{schoolId:guid}/units")]
    [Authorize(Policy = AppPolicies.StudentOnly)]
    public async Task<IActionResult> GetSchoolUnitAssignments(Guid schoolId)
    {
        try { return Ok(await _service.GetSchoolUnitAssignmentsAsync(schoolId)); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>GET /api/school-curriculum/{schoolId}/topics — all Topics currently assigned to a School.</summary>
    [HttpGet("{schoolId:guid}/topics")]
    [Authorize(Policy = AppPolicies.StudentOnly)]
    public async Task<IActionResult> GetSchoolTopicAssignments(Guid schoolId)
    {
        try { return Ok(await _service.GetSchoolTopicAssignmentsAsync(schoolId)); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>GET /api/school-curriculum/{schoolId}/dashboard — assigned unit/topic counts plus teacher/student counts (Requirement 7.3).</summary>
    [HttpGet("{schoolId:guid}/dashboard")]
    [Authorize(Policy = AppPolicies.TeacherOnly)]
    public async Task<IActionResult> GetDashboard(Guid schoolId)
    {
        try { return Ok(await _service.GetDashboardAsync(schoolId)); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>GET /api/school-curriculum/audit-log?schoolId=&amp;entityType=&amp;entityId=&amp;fromDate=&amp;toDate=&amp;page=&amp;pageSize= — assignment history.</summary>
    [HttpGet("audit-log")]
    [Authorize(Policy = AppPolicies.StaffOnly)]
    public async Task<IActionResult> GetAuditLog([FromQuery] CurriculumAssignmentAuditLogQueryDto query)
    {
        try { return Ok(await _service.GetAuditLogAsync(query)); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>POST /api/school-curriculum/assign-units — bulk-assign one or more master Units to a School.</summary>
    [HttpPost("assign-units")]
    [Authorize(Policy = AppPolicies.StaffOnly)]
    public async Task<IActionResult> AssignUnits([FromBody] AssignUnitsToSchoolDto dto)
    {
        try { return Ok(await _service.AssignUnitsToSchoolAsync(dto)); }
        catch (KeyNotFoundException      ex) { return NotFound(new  { message = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
        catch (Exception                 ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>POST /api/school-curriculum/assign-topics — bulk-assign one or more master Topics to a School. Each Topic's parent Unit must already be assigned.</summary>
    [HttpPost("assign-topics")]
    [Authorize(Policy = AppPolicies.StaffOnly)]
    public async Task<IActionResult> AssignTopics([FromBody] AssignTopicsToSchoolDto dto)
    {
        try { return Ok(await _service.AssignTopicsToSchoolAsync(dto)); }
        catch (KeyNotFoundException      ex) { return NotFound(new  { message = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
        catch (Exception                 ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>POST /api/school-curriculum/unassign-units — bulk-unassign Units from a School. Cascades: any Topic of that Unit assigned to the same School is unassigned too.</summary>
    [HttpPost("unassign-units")]
    [Authorize(Policy = AppPolicies.StaffOnly)]
    public async Task<IActionResult> UnassignUnits([FromBody] UnassignUnitsFromSchoolDto dto)
    {
        try { return Ok(await _service.UnassignUnitsFromSchoolAsync(dto)); }
        catch (KeyNotFoundException      ex) { return NotFound(new  { message = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
        catch (Exception                 ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>POST /api/school-curriculum/unassign-topics — bulk-unassign Topics from a School.</summary>
    [HttpPost("unassign-topics")]
    [Authorize(Policy = AppPolicies.StaffOnly)]
    public async Task<IActionResult> UnassignTopics([FromBody] UnassignTopicsFromSchoolDto dto)
    {
        try { return Ok(await _service.UnassignTopicsFromSchoolAsync(dto)); }
        catch (KeyNotFoundException      ex) { return NotFound(new  { message = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
        catch (Exception                 ex) { return BadRequest(new { message = ex.Message }); }
    }
}
