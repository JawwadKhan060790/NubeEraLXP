using Microsoft.EntityFrameworkCore;
using Veriton.Application.DTOs;
using Veriton.Application.Interfaces.Repositories;
using Veriton.Application.Interfaces.Security;
using Veriton.Application.Interfaces.Services;
using Veriton.Domain.Entities;

namespace Veriton.Application.Services;

public class GradeSectionService : IGradeSectionService
{
    private readonly IGenericRepository<GradeSection> _repo;
    private readonly IGenericRepository<Grade>        _gradeRepo;
    private readonly IGenericRepository<Student>      _studentRepo;
    private readonly ICurrentUserService              _currentUserService;
    private readonly ITenantService                   _tenantService;
    private readonly IGradeAccessService              _gradeAccessService;

    public GradeSectionService(
        IGenericRepository<GradeSection> repo,
        IGenericRepository<Grade>        gradeRepo,
        IGenericRepository<Student>      studentRepo,
        ICurrentUserService              currentUserService,
        ITenantService                   tenantService,
        IGradeAccessService              gradeAccessService)
    {
        _repo               = repo;
        _gradeRepo          = gradeRepo;
        _studentRepo        = studentRepo;
        _currentUserService = currentUserService;
        _tenantService      = tenantService;
        _gradeAccessService = gradeAccessService;
    }

    // ── Read ─────────────────────────────────────────────────────────────────

    public async Task<List<GradeSectionDto>> GetAllAsync()
    {
        var sections = await _repo.GetAllAsync(q =>
            q.Include(s => s.School)
             .Include(s => s.Grade)
             .Include(s => s.Students)
             .OrderBy(s => s.Grade.GradeName)
             .ThenBy(s => s.SectionCode));

        return sections.Select(MapToDto).ToList();
    }

    public async Task<List<GradeSectionDto>> GetByGradeAsync(Guid gradeId)
    {
        var sections = await _repo.GetAllAsync(q =>
            q.Where(s => s.GradeId == gradeId)
             .Include(s => s.School)
             .Include(s => s.Grade)
             .Include(s => s.Students)
             .OrderBy(s => s.SectionCode));

        return sections.Select(MapToDto).ToList();
    }

    public async Task<List<GradeSectionDto>> GetBySchoolAsync(Guid schoolId, Guid? gradeId = null)
    {
        var sections = await _repo.GetAllAsync(q =>
        {
            var query = q.Where(s => s.SchoolId == schoolId);
            if (gradeId.HasValue)
                query = query.Where(s => s.GradeId == gradeId.Value);
            return query
                .Include(s => s.School)
                .Include(s => s.Grade)
                .Include(s => s.Students)
                .OrderBy(s => s.Grade.GradeName)
                .ThenBy(s => s.SectionCode);
        });

        return sections.Select(MapToDto).ToList();
    }

    public async Task<GradeSectionDto?> GetByIdAsync(Guid id)
    {
        var s = await _repo.GetByIdAsync(id, q =>
            q.Include(s => s.School)
             .Include(s => s.Grade)
             .Include(s => s.Students));

        return s == null ? null : MapToDto(s);
    }

    // ── Write ────────────────────────────────────────────────────────────────

    public async Task<Guid> CreateAsync(GradeSectionCreateDto dto)
    {
        var grade = await _gradeRepo.GetByIdAsync(dto.GradeId)
            ?? throw new KeyNotFoundException("Grade not found.");

        // Hard security/consistency gate: a Division can only be created for a Grade
        // whose level falls within its own school's configured grade range — same rule
        // enforced everywhere else a GradeId is accepted from the client.
        await _gradeAccessService.EnsureGradeAccessibleToCurrentUserAsync(dto.GradeId);

        // Resolve school
        Guid schoolId = dto.SchoolId != Guid.Empty
            ? dto.SchoolId
            : (grade.SchoolId ?? _tenantService.GetEffectiveSchoolId() ?? _currentUserService.SchoolId ?? Guid.Empty);

        // Check for duplicate section code within the same grade
        var existing = (await _repo.GetAllAsync(q =>
            q.Where(s => s.GradeId == dto.GradeId &&
                         s.SectionCode.ToUpper() == dto.SectionCode.ToUpper())))
            .FirstOrDefault();

        if (existing != null)
            throw new InvalidOperationException(
                $"Division '{dto.SectionCode}' already exists for this grade.");

        var entity = new GradeSection
        {
            SchoolId    = schoolId,
            GradeId     = dto.GradeId,
            SectionCode = dto.SectionCode.ToUpper().Trim(),
            SectionName = dto.SectionName?.Trim(),
            Capacity    = dto.Capacity,
            Description = dto.Description,
            IsActive    = true
        };

        await _repo.AddAsync(entity);
        return entity.Id;
    }

    public async Task UpdateAsync(Guid id, GradeSectionUpdateDto dto)
    {
        var entity = await _repo.GetByIdAsync(id)
            ?? throw new KeyNotFoundException("Division not found.");

        entity.SectionCode = dto.SectionCode.ToUpper().Trim();
        entity.SectionName = dto.SectionName?.Trim();
        entity.Capacity    = dto.Capacity;
        entity.Description = dto.Description;
        entity.IsActive    = dto.IsActive;

        await _repo.UpdateAsync(entity);
    }

    public async Task DeleteAsync(Guid id)
    {
        var entity = await _repo.GetByIdAsync(id)
            ?? throw new KeyNotFoundException("Division not found.");

        await _repo.DeleteAsync(entity);
    }

    // ── Mapping ──────────────────────────────────────────────────────────────

    private static GradeSectionDto MapToDto(GradeSection s) => new()
    {
        Id           = s.Id,
        SchoolId     = s.SchoolId,
        SchoolName   = s.School?.Name ?? "",
        GradeId      = s.GradeId,
        GradeName    = s.Grade?.GradeName ?? "",
        GradeLevel   = s.Grade?.GradeLevel ?? "",
        SectionCode  = s.SectionCode,
        SectionName  = s.SectionName,
        Capacity     = s.Capacity,
        Description  = s.Description,
        IsActive     = s.IsActive,
        StudentCount = s.Students?.Count ?? 0
    };
}
