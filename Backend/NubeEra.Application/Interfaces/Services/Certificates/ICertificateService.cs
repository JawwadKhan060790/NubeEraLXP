using NubeEra.Application.DTOs;

namespace NubeEra.Application.Interfaces.Services.Certificates;

public interface ICertificateService
{
    // ── Templates ───────────────────────────────────────────────────────────
    Task<List<CertificateTemplateDto>> GetTemplatesAsync(Guid? schoolId = null);
    Task<CertificateTemplateDto> GetTemplateByIdAsync(Guid id);
    Task<CertificateTemplateDto> CreateTemplateAsync(CertificateTemplateCreateDto dto);
    Task<CertificateTemplateDto> UpdateTemplateAsync(Guid id, CertificateTemplateUpdateDto dto);
    Task DeleteTemplateAsync(Guid id);

    // ── Certificates (Admin/Staff) ──────────────────────────────────────────
    Task<List<CertificateListItemDto>> GetAllCertificatesAsync(string? status, Guid? schoolId, string? search);
    Task<CertificateDto> GetCertificateByIdAsync(Guid id);
    Task<CertificateDto> CreateCertificateAsync(CertificateCreateDto dto);
    Task<List<CertificateDto>> BulkCreateCertificatesAsync(BulkCertificateCreateDto dto);
    Task<CertificateDto> UpdateCertificateAsync(Guid id, CertificateUpdateDto dto);
    Task<CertificateDto> ApproveCertificateAsync(Guid id, CertificateApproveDto dto);
    Task<CertificateDto> RevokeCertificateAsync(Guid id, CertificateRevokeDto dto);
    Task<CertificateDto> ReissueCertificateAsync(Guid id);
    Task DeleteCertificateAsync(Guid id);

    // ── Student / Parent views ──────────────────────────────────────────────
    Task<List<CertificateListItemDto>> GetMyCertificatesAsync();          // student
    Task<List<CertificateListItemDto>> GetChildCertificatesAsync();        // parent

    // ── Download tracking ──────────────────────────────────────────────────
    Task RecordDownloadAsync(Guid id);

    // ── Verification ───────────────────────────────────────────────────────
    Task<CertificateDto?> VerifyCertificateAsync(string certificateNumber);
}
