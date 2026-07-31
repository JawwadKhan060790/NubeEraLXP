using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Veriton.Application.DTOs;
using Veriton.Application.Interfaces.Security;
using Veriton.Application.Interfaces.Services.Certificates;
using Veriton.Application.Interfaces.Services;

namespace Veriton.API.Controllers.Certificates;

[ApiController]
[Route("api/certificates")]
[Authorize]
public class CertificateController : ControllerBase
{
    private readonly ICertificateService _certService;
    private readonly ICertificatePdfService _pdfService;
    private readonly ICurrentUserService _currentUser;
    private readonly ITenantService _tenant;

    // Logo is served from the Frontend assets folder shipped with the app.
    // In production this resolves to the wwwroot copy; adjust via appsettings if needed.
    private static readonly string LogoPath = Path.Combine(
        AppContext.BaseDirectory, "wwwroot", "assets", "logoveri.png");

    public CertificateController(
        ICertificateService certService,
        ICertificatePdfService pdfService,
        ICurrentUserService currentUser,
        ITenantService tenant)
    {
        _certService = certService;
        _pdfService  = pdfService;
        _currentUser = currentUser;
        _tenant      = tenant;
    }

    // ════════════════════════════════════════════════════════════════════════
    // TEMPLATES
    // ════════════════════════════════════════════════════════════════════════

    /// <summary>GET /api/certificates/templates  — list all templates (optionally filter by schoolId)</summary>
    [HttpGet("templates")]
    public async Task<IActionResult> GetTemplates([FromQuery] Guid? schoolId)
    {
        var list = await _certService.GetTemplatesAsync(schoolId);
        return Ok(list);
    }

    /// <summary>GET /api/certificates/templates/{id}</summary>
    [HttpGet("templates/{id:guid}")]
    public async Task<IActionResult> GetTemplate(Guid id)
    {
        var dto = await _certService.GetTemplateByIdAsync(id);
        return Ok(dto);
    }

    /// <summary>POST /api/certificates/templates  — SuperAdmin / Admin only</summary>
    [HttpPost("templates")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> CreateTemplate([FromBody] CertificateTemplateCreateDto dto)
    {
        var created = await _certService.CreateTemplateAsync(dto);
        return CreatedAtAction(nameof(GetTemplate), new { id = created.Id }, created);
    }

    /// <summary>PUT /api/certificates/templates/{id}</summary>
    [HttpPut("templates/{id:guid}")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> UpdateTemplate(Guid id, [FromBody] CertificateTemplateUpdateDto dto)
    {
        var updated = await _certService.UpdateTemplateAsync(id, dto);
        return Ok(updated);
    }

    /// <summary>DELETE /api/certificates/templates/{id}</summary>
    [HttpDelete("templates/{id:guid}")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> DeleteTemplate(Guid id)
    {
        await _certService.DeleteTemplateAsync(id);
        return NoContent();
    }

    // ════════════════════════════════════════════════════════════════════════
    // CERTIFICATES — Admin / Staff / Teacher management
    // ════════════════════════════════════════════════════════════════════════

    /// <summary>GET /api/certificates?status=&schoolId=&search=</summary>
    [HttpGet]
    [Authorize(Roles = "SuperAdmin,Admin,Principal,Staff,Teacher")]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? status,
        [FromQuery] Guid? schoolId,
        [FromQuery] string? search)
    {
        // Tenant override: school-restricted roles (Principal) always use their JWT school;
        // Admin/SuperAdmin use the X-School-Id header or the caller-supplied schoolId param.
        var effectiveSchoolId = _tenant.GetEffectiveSchoolId() ?? schoolId;
        var list = await _certService.GetAllCertificatesAsync(status, effectiveSchoolId, search);
        return Ok(list);
    }

    /// <summary>GET /api/certificates/{id}</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var cert = await _certService.GetCertificateByIdAsync(id);
        return Ok(cert);
    }

    /// <summary>POST /api/certificates  — Admin / Principal / Staff / Teacher (single generate)</summary>
    [HttpPost]
    [Authorize(Roles = "SuperAdmin,Admin,Principal,Staff,Teacher")]
    public async Task<IActionResult> Create([FromBody] CertificateCreateDto dto)
    {
        var cert = await _certService.CreateCertificateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = cert.Id }, cert);
    }

    /// <summary>POST /api/certificates/bulk  — Admin / Principal / Staff / Teacher (bulk generate)</summary>
    [HttpPost("bulk")]
    [Authorize(Roles = "SuperAdmin,Admin,Principal,Staff,Teacher")]
    public async Task<IActionResult> BulkCreate([FromBody] BulkCertificateCreateDto dto)
    {
        var certs = await _certService.BulkCreateCertificatesAsync(dto);
        return Ok(certs);
    }

    /// <summary>PUT /api/certificates/{id}  — Admin / Principal / Staff / Teacher</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "SuperAdmin,Admin,Principal,Staff,Teacher")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CertificateUpdateDto dto)
    {
        var cert = await _certService.UpdateCertificateAsync(id, dto);
        return Ok(cert);
    }

    /// <summary>POST /api/certificates/{id}/approve  — Admin / Principal</summary>
    [HttpPost("{id:guid}/approve")]
    [Authorize(Roles = "SuperAdmin,Admin,Principal")]
    public async Task<IActionResult> Approve(Guid id, [FromBody] CertificateApproveDto dto)
    {
        var cert = await _certService.ApproveCertificateAsync(id, dto);
        return Ok(cert);
    }

    /// <summary>POST /api/certificates/{id}/revoke  — Admin / Principal</summary>
    [HttpPost("{id:guid}/revoke")]
    [Authorize(Roles = "SuperAdmin,Admin,Principal")]
    public async Task<IActionResult> Revoke(Guid id, [FromBody] CertificateRevokeDto dto)
    {
        var cert = await _certService.RevokeCertificateAsync(id, dto);
        return Ok(cert);
    }

    /// <summary>POST /api/certificates/{id}/reissue  — Admin / Principal</summary>
    [HttpPost("{id:guid}/reissue")]
    [Authorize(Roles = "SuperAdmin,Admin,Principal")]
    public async Task<IActionResult> Reissue(Guid id)
    {
        var cert = await _certService.ReissueCertificateAsync(id);
        return Ok(cert);
    }

    /// <summary>DELETE /api/certificates/{id}  — SuperAdmin / Admin only</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _certService.DeleteCertificateAsync(id);
        return NoContent();
    }

    // ════════════════════════════════════════════════════════════════════════
    // STUDENT / PARENT VIEWS
    // ════════════════════════════════════════════════════════════════════════

    /// <summary>GET /api/certificates/my  — Student: see own approved/issued certs</summary>
    [HttpGet("my")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> GetMyCertificates()
    {
        var list = await _certService.GetMyCertificatesAsync();
        return Ok(list);
    }

    /// <summary>GET /api/certificates/children  — Parent: see all children's certs</summary>
    [HttpGet("children")]
    [Authorize(Roles = "Parent")]
    public async Task<IActionResult> GetChildCertificates()
    {
        var list = await _certService.GetChildCertificatesAsync();
        return Ok(list);
    }

    // ════════════════════════════════════════════════════════════════════════
    // PDF DOWNLOAD
    // ════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// GET /api/certificates/{id}/download
    /// Returns the certificate as a downloadable PDF.
    /// All authenticated roles may download certificates they have access to.
    /// </summary>
    [HttpGet("{id:guid}/download")]
    public async Task<IActionResult> Download(Guid id)
    {
        var cert = await _certService.GetCertificateByIdAsync(id);

        // Students may only download their own; parents only their children's.
        // Admin/Staff/Teacher/Principal can download any.
        var role = _currentUser.Role;
        if (role == "Student" && cert.StudentId != _currentUser.StudentId)
            return Forbid();

        if (role == "Parent")
        {
            // GetChildCertificatesAsync already enforces phone-match;
            // here we just verify the cert belongs to one of their children.
            var childCerts = await _certService.GetChildCertificatesAsync();
            if (!childCerts.Any(c => c.Id == id))
                return Forbid();
        }

        var pdfBytes = await _pdfService.GeneratePdfAsync(cert, LogoPath);
        await _certService.RecordDownloadAsync(id);

        var fileName = $"Certificate_{cert.CertificateNumber}.pdf";
        return File(pdfBytes, "application/pdf", fileName);
    }

    // ════════════════════════════════════════════════════════════════════════
    // PUBLIC VERIFICATION (no auth required)
    // ════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// GET /api/certificates/verify/{certNumber}
    /// Public QR scan endpoint — returns basic certificate info if valid.
    /// </summary>
    [HttpGet("verify/{certNumber}")]
    [AllowAnonymous]
    public async Task<IActionResult> Verify(string certNumber)
    {
        var cert = await _certService.VerifyCertificateAsync(certNumber);
        if (cert is null)
            return NotFound(new { message = "Certificate not found or has been revoked." });

        // Return only the non-sensitive fields suitable for public display.
        return Ok(new
        {
            cert.CertificateNumber,
            cert.StudentName,
            cert.GradeName,
            cert.SchoolName,
            cert.CourseName,
            cert.ProgramType,
            cert.AcademicYear,
            cert.CompletionDate,
            cert.Status,
            cert.IssuedAt,
            cert.PerformanceLevel,
        });
    }
}
