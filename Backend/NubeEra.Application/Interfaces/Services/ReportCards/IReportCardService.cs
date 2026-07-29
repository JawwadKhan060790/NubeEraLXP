using NubeEra.Application.DTOs;

namespace NubeEra.Application.Interfaces.Services.ReportCards;

public interface IReportCardService
{
    // ── Generate ──────────────────────────────────────────────────────────────
    Task<ReportCardDto> GenerateAsync(GenerateReportCardDto dto);
    Task<BulkGenerateResultDto> BulkGenerateAsync(BulkGenerateReportCardDto dto);

    // ── CRUD ──────────────────────────────────────────────────────────────────
    Task<ReportCardDto> GetByIdAsync(Guid id);
    Task<List<ReportCardListItemDto>> GetAllAsync(Guid? schoolId, string? status, string? academicYear, string? examType, string? search);
    Task<List<ReportCardListItemDto>> GetByStudentAsync(Guid studentId);
    Task<List<ReportCardListItemDto>> GetForParentAsync(Guid parentUserId);
    Task<ReportCardDto> UpdateAsync(Guid id, UpdateReportCardDto dto);
    Task DeleteAsync(Guid id);

    // ── Workflow ──────────────────────────────────────────────────────────────
    Task<ReportCardDto> PublishAsync(Guid id, PublishReportCardDto dto);
    Task<ReportCardDto> UnpublishAsync(Guid id);
    Task<ReportCardDto> ArchiveAsync(Guid id);

    // ── Grading Rules ─────────────────────────────────────────────────────────
    Task<List<ReportCardGradingRuleDto>> GetGradingRulesAsync(Guid? schoolId);
    Task<ReportCardGradingRuleDto> UpsertGradingRuleAsync(Guid? schoolId, Guid? ruleId, UpsertGradingRuleDto dto);
    Task DeleteGradingRuleAsync(Guid id);

    // ── Analytics ─────────────────────────────────────────────────────────────
    Task IncrementDownloadCountAsync(Guid id);
}
