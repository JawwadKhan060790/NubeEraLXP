using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Security;
using NubeEra.Application.Interfaces.Services;
using NubeEra.Application.Interfaces.Services.ReportCards;
using NubeEra.Domain.Common;

namespace NubeEra.API.Controllers.ReportCards;

[ApiController]
[Route("api/report-cards")]
[Authorize]
public class ReportCardsController : ControllerBase
{
    private readonly IReportCardService _service;
    private readonly IReportCardPdfService _pdfService;
    private readonly ICurrentUserService _currentUser;
    private readonly ITenantService _tenant;

    public ReportCardsController(
        IReportCardService service,
        IReportCardPdfService pdfService,
        ICurrentUserService currentUser,
        ITenantService tenant)
    {
        _service    = service;
        _pdfService = pdfService;
        _currentUser = currentUser;
        _tenant     = tenant;
    }

    // ════════════════════════════════════════════════════════════════════════
    // LIST / GET
    // ════════════════════════════════════════════════════════════════════════

    /// <summary>GET /api/report-cards  — Admin/Principal/Staff/Teacher filtered list</summary>
    [HttpGet]
    [Authorize(Roles = AppRoles.TeacherAndAbove)]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? schoolId,
        [FromQuery] string? status,
        [FromQuery] string? academicYear,
        [FromQuery] string? examType,
        [FromQuery] string? search)
    {
        // Tenant override: Principal is always locked to their JWT school.
        var effectiveSchoolId = _tenant.GetEffectiveSchoolId() ?? schoolId;
        var list = await _service.GetAllAsync(effectiveSchoolId, status, academicYear, examType, search);
        return Ok(list);
    }

    /// <summary>GET /api/report-cards/{id}</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var rc = await _service.GetByIdAsync(id);
        return Ok(rc);
    }

    /// <summary>GET /api/report-cards/student/me  — Student sees their own published cards</summary>
    [HttpGet("student/me")]
    [Authorize(Roles = AppRoles.Student)]
    public async Task<IActionResult> GetMyReportCards()
    {
        if (!_currentUser.StudentId.HasValue)
            return BadRequest("Student profile not linked to account.");
        var list = await _service.GetByStudentAsync(_currentUser.StudentId.Value);
        return Ok(list);
    }

    /// <summary>GET /api/report-cards/student/{studentId}  — Admin/Staff sees a specific student's cards</summary>
    [HttpGet("student/{studentId:guid}")]
    [Authorize(Roles = AppRoles.TeacherAndAbove)]
    public async Task<IActionResult> GetByStudent(Guid studentId)
    {
        var list = await _service.GetByStudentAsync(studentId);
        return Ok(list);
    }

    /// <summary>GET /api/report-cards/parent/me  — Parent sees children's published cards</summary>
    [HttpGet("parent/me")]
    [Authorize(Roles = AppRoles.Parent)]
    public async Task<IActionResult> GetForParent()
    {
        if (!Guid.TryParse(_currentUser.UserId, out var userId))
            return Unauthorized();
        var list = await _service.GetForParentAsync(userId);
        return Ok(list);
    }

    // ════════════════════════════════════════════════════════════════════════
    // GENERATE
    // ════════════════════════════════════════════════════════════════════════

    /// <summary>POST /api/report-cards/generate  — Generate a single report card</summary>
    [HttpPost("generate")]
    [Authorize(Roles = AppRoles.TeacherAndAbove)]
    public async Task<IActionResult> Generate([FromBody] GenerateReportCardDto dto)
    {
        var rc = await _service.GenerateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = rc.Id }, rc);
    }

    /// <summary>POST /api/report-cards/bulk-generate  — Generate for multiple students at once</summary>
    [HttpPost("bulk-generate")]
    [Authorize(Roles = AppRoles.PrincipalAndAbove)]
    public async Task<IActionResult> BulkGenerate([FromBody] BulkGenerateReportCardDto dto)
    {
        var result = await _service.BulkGenerateAsync(dto);
        return Ok(result);
    }

    // ════════════════════════════════════════════════════════════════════════
    // UPDATE / DELETE
    // ════════════════════════════════════════════════════════════════════════

    /// <summary>PUT /api/report-cards/{id}</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = AppRoles.TeacherAndAbove)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateReportCardDto dto)
    {
        var rc = await _service.UpdateAsync(id, dto);
        return Ok(rc);
    }

    /// <summary>DELETE /api/report-cards/{id}</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = AppRoles.PrincipalAndAbove)]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }

    // ════════════════════════════════════════════════════════════════════════
    // WORKFLOW
    // ════════════════════════════════════════════════════════════════════════

    /// <summary>POST /api/report-cards/{id}/publish</summary>
    [HttpPost("{id:guid}/publish")]
    [Authorize(Roles = AppRoles.PrincipalAndAbove)]
    public async Task<IActionResult> Publish(Guid id, [FromBody] PublishReportCardDto dto)
    {
        var rc = await _service.PublishAsync(id, dto);
        return Ok(rc);
    }

    /// <summary>POST /api/report-cards/{id}/unpublish</summary>
    [HttpPost("{id:guid}/unpublish")]
    [Authorize(Roles = AppRoles.PrincipalAndAbove)]
    public async Task<IActionResult> Unpublish(Guid id)
    {
        var rc = await _service.UnpublishAsync(id);
        return Ok(rc);
    }

    /// <summary>POST /api/report-cards/{id}/archive</summary>
    [HttpPost("{id:guid}/archive")]
    [Authorize(Roles = AppRoles.PrincipalAndAbove)]
    public async Task<IActionResult> Archive(Guid id)
    {
        var rc = await _service.ArchiveAsync(id);
        return Ok(rc);
    }

    // ════════════════════════════════════════════════════════════════════════
    // PDF DOWNLOAD
    // ════════════════════════════════════════════════════════════════════════

    /// <summary>GET /api/report-cards/{id}/pdf  — Download PDF (all authenticated roles)</summary>
    [HttpGet("{id:guid}/pdf")]
    public async Task<IActionResult> DownloadPdf(Guid id)
    {
        var rc = await _service.GetByIdAsync(id);

        // Security: students may only download their own; parents only their children's
        var role = _currentUser.Role?.ToLower();
        if (role == "student")
        {
            if (!_currentUser.StudentId.HasValue || rc.StudentId != _currentUser.StudentId.Value.ToString())
                return Forbid();
            if (!rc.IsVisibleToStudent) return Forbid();
        }
        else if (role == "parent")
        {
            if (!rc.IsVisibleToParent) return Forbid();
        }

        await _service.IncrementDownloadCountAsync(id);
        var pdfBytes = _pdfService.GeneratePdf(rc);
        var fileName = $"ReportCard_{rc.ReportCardNumber}_{rc.StudentName.Replace(" ", "_")}.pdf";
        return File(pdfBytes, "application/pdf", fileName);
    }

    // ════════════════════════════════════════════════════════════════════════
    // GRADING RULES
    // ════════════════════════════════════════════════════════════════════════

    /// <summary>GET /api/report-cards/grading-rules</summary>
    [HttpGet("grading-rules")]
    [Authorize(Roles = AppRoles.TeacherAndAbove)]
    public async Task<IActionResult> GetGradingRules([FromQuery] Guid? schoolId)
    {
        var rules = await _service.GetGradingRulesAsync(schoolId);
        return Ok(rules);
    }

    /// <summary>POST /api/report-cards/grading-rules</summary>
    [HttpPost("grading-rules")]
    [Authorize(Roles = AppRoles.PrincipalAndAbove)]
    public async Task<IActionResult> CreateGradingRule(
        [FromQuery] Guid? schoolId,
        [FromBody] UpsertGradingRuleDto dto)
    {
        var rule = await _service.UpsertGradingRuleAsync(schoolId, null, dto);
        return Ok(rule);
    }

    /// <summary>PUT /api/report-cards/grading-rules/{id}</summary>
    [HttpPut("grading-rules/{id:guid}")]
    [Authorize(Roles = AppRoles.PrincipalAndAbove)]
    public async Task<IActionResult> UpdateGradingRule(Guid id, [FromBody] UpsertGradingRuleDto dto)
    {
        var rule = await _service.UpsertGradingRuleAsync(null, id, dto);
        return Ok(rule);
    }

    /// <summary>DELETE /api/report-cards/grading-rules/{id}</summary>
    [HttpDelete("grading-rules/{id:guid}")]
    [Authorize(Roles = AppRoles.AdminAndAbove)]
    public async Task<IActionResult> DeleteGradingRule(Guid id)
    {
        await _service.DeleteGradingRuleAsync(id);
        return NoContent();
    }
}
