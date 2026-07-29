using System.Linq;
using Microsoft.EntityFrameworkCore;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Repositories;
using NubeEra.Application.Interfaces.Services;
using NubeEra.Domain.Common;
using NubeEra.Domain.Entities;
using NubeEra.Application.Interfaces.Security;

namespace NubeEra.Application.Services;

public class GradeService : IGradeService
{
    private readonly IGenericRepository<Grade> _repository;
    private readonly ICurrentUserService _currentUserService;
    private readonly ITenantService       _tenantService;
    private readonly IGradeAccessService _gradeAccessService;

    public GradeService(
        IGenericRepository<Grade> repository,
        ICurrentUserService currentUserService,
        ITenantService tenantService,
        IGradeAccessService gradeAccessService)
    {
        _repository = repository;
        _currentUserService = currentUserService;
        _tenantService       = tenantService;
        _gradeAccessService = gradeAccessService;
    }

    public async Task<List<GradeDto>> GetAllAsync()
    {
        // ── Only active grades ──────────────────────────────────────────────────
        var grades = await _repository.GetAllAsync(q => q
            .Include(g => g.School)
            .Include(g => g.ClassTeacher)
            .Include(g => g.Students)
            .Where(g => g.IsActive));

        // Centralized grade visibility: never return class/sections whose grade level
        // falls outside THEIR OWN school's configured range — this is the same rule
        // applied everywhere (dropdowns, filters, reports, APIs). No per-module re-implementation.
        // Batch-prefetch school ranges to avoid N+1 (SchoolGradeRangeService caches per school,
        // but prefetching still eliminates the first-call round trips).
        var visible = await FilterByAllowedLevelsAsync(grades);

        return visible
            .OrderBy(g => TryParseLevelNumber(g.GradeLevel, out var val) ? val : int.MaxValue)
            .ThenBy(g => g.GradeLevel)
            .ThenBy(g => g.GradeName)
            .Select(MapToDto)
            .ToList();
    }

    public async Task<GradeDto?> GetByIdAsync(Guid id)
    {
        // Hard security gate: even if the caller manually crafts a request for a GradeId
        // outside their school's configured grade range (or belonging to another school),
        // this throws GradeAccessForbiddenException -> HTTP 403. Single source of truth.
        await _gradeAccessService.EnsureGradeAccessibleToCurrentUserAsync(id);

        var g = await _repository.GetByIdAsync(id, q => q.Include(g => g.School).Include(g => g.ClassTeacher).Include(g => g.Students));
        if (g == null) return null;

        return MapToDto(g);
    }

    public async Task<Guid> CreateAsync(GradeCreateDto dto)
    {
        var schoolId = dto.SchoolId.HasValue && dto.SchoolId.Value != Guid.Empty 
            ? dto.SchoolId 
            : _tenantService.GetEffectiveSchoolId();

        // Enforce SchoolId for school-restricted roles:
        if (_tenantService.IsSchoolRestrictedRole() && !schoolId.HasValue)
        {
            schoolId = _tenantService.GetEffectiveSchoolId();
        }

        var gradeLevelParam = dto.GradeLevel;
        if (!dto.GradeLevelId.HasValue && string.IsNullOrWhiteSpace(gradeLevelParam))
        {
            gradeLevelParam = dto.GradeName;
        }
        var (resolvedLevelId, levelNumber, levelName) = await ResolveGradeLevelAsync(dto.GradeLevelId, gradeLevelParam);
        await _gradeAccessService.EnsureLevelNumberAllowedAsync(schoolId, levelNumber);

        // Duplicate check
        var duplicate = (await _repository.GetAllAsync(q => q
            .Where(g => g.SchoolId == schoolId 
                     && g.GradeLevelId == resolvedLevelId 
                     && g.AcademicYear == dto.AcademicYear 
                     && g.IsActive)))
            .FirstOrDefault();

        if (duplicate != null)
        {
            throw new InvalidOperationException($"Grade level '{levelNumber}' already exists for this {(schoolId.HasValue ? "school" : "global context")} in the academic year '{dto.AcademicYear}'.");
        }

        var grade = new Grade
        {
            SchoolId = schoolId,
            GradeLevelId = resolvedLevelId,
            GradeLevel = levelNumber.ToString(),
            GradeName = !string.IsNullOrEmpty(dto.GradeName)
                ? dto.GradeName
                : levelName,
            Capacity = dto.Capacity ?? 0,
            ClassTeacherId = dto.ClassTeacherId,
            ClassRoom = dto.ClassRoom,
            AcademicYear = dto.AcademicYear,
            IsActive = true
        };

        await _repository.AddAsync(grade);
        return grade.Id;
    }

    public async Task UpdateAsync(Guid id, GradeUpdateDto dto)
    {
        await _gradeAccessService.EnsureGradeAccessibleToCurrentUserAsync(id);

        var grade = await _repository.GetByIdAsync(id)
            ?? throw new Exception("Grade not found");

        var allowSchoolSelect = new[] { "SuperAdmin", "Admin", "Staff" };
        var role = _currentUserService.Role ?? "";

        var targetSchoolId = grade.SchoolId;
        if (allowSchoolSelect.Any(r => r.Equals(role, StringComparison.OrdinalIgnoreCase)))
        {
            targetSchoolId = dto.SchoolId.HasValue && dto.SchoolId.Value != Guid.Empty ? dto.SchoolId : null;
        }

        var gradeLevelParam = dto.GradeLevel;
        if (!dto.GradeLevelId.HasValue && string.IsNullOrWhiteSpace(gradeLevelParam))
        {
            gradeLevelParam = dto.GradeName;
        }
        var (resolvedLevelId, levelNumber, levelName) = await ResolveGradeLevelAsync(dto.GradeLevelId, gradeLevelParam);
        await _gradeAccessService.EnsureLevelNumberAllowedAsync(targetSchoolId, levelNumber);

        // Duplicate check
        var duplicate = (await _repository.GetAllAsync(q => q
            .Where(g => g.Id != id 
                     && g.SchoolId == targetSchoolId 
                     && g.GradeLevelId == resolvedLevelId 
                     && g.AcademicYear == dto.AcademicYear 
                     && g.IsActive)))
            .FirstOrDefault();

        if (duplicate != null)
        {
            throw new InvalidOperationException($"Grade level '{levelNumber}' already exists for this {(targetSchoolId.HasValue ? "school" : "global context")} in the academic year '{dto.AcademicYear}'.");
        }

        if (allowSchoolSelect.Any(r => r.Equals(role, StringComparison.OrdinalIgnoreCase)))
        {
            grade.SchoolId = targetSchoolId;
        }

        grade.GradeLevelId = resolvedLevelId;
        grade.GradeLevel = levelNumber.ToString();
        grade.GradeName = !string.IsNullOrEmpty(dto.GradeName)
            ? dto.GradeName
            : levelName;
        grade.Capacity = dto.Capacity ?? 0;
        grade.ClassTeacherId = dto.ClassTeacherId;
        grade.ClassRoom = dto.ClassRoom;
        grade.AcademicYear = dto.AcademicYear;
        grade.IsActive = dto.IsActive;

        await _repository.UpdateAsync(grade);
    }

    public async Task DeleteAsync(Guid id)
    {
        await _gradeAccessService.EnsureGradeAccessibleToCurrentUserAsync(id);

        var grade = await _repository.GetByIdAsync(id)
            ?? throw new Exception("Grade not found");

        await _repository.DeleteAsync(grade);
    }

    public async Task<List<GradeDto>> GetBySchoolAsync(Guid schoolId)
    {
        var grades = await _repository.GetAllAsync(q => q
            .Include(g => g.School)
            .Include(g => g.ClassTeacher)
            .Include(g => g.Students)
            .Where(g => g.IsActive && (g.SchoolId == schoolId || g.SchoolId == null)));

        var visible = await FilterByAllowedLevelsAsync(grades, schoolId);

        return visible
            .OrderBy(g => TryParseLevelNumber(g.GradeLevel, out var val) ? val : int.MaxValue)
            .ThenBy(g => g.GradeLevel)
            .ThenBy(g => g.GradeName)
            .Select(MapToDto)
            .ToList();
    }

    public async Task<List<GradeDto>> GetAccessibleAsync()
    {
        var schoolId = _tenantService.GetEffectiveSchoolId();
        var grades = await _repository.GetAllAsync(q => q
            .Include(g => g.School)
            .Include(g => g.ClassTeacher)
            .Include(g => g.Students)
            .Where(g => g.IsActive && (!schoolId.HasValue || g.SchoolId == schoolId.Value || g.SchoolId == null)));

        var visible = await FilterByAllowedLevelsAsync(grades, schoolId);

        return visible
            .OrderBy(g => TryParseLevelNumber(g.GradeLevel, out var val) ? val : int.MaxValue)
            .ThenBy(g => g.GradeLevel)
            .ThenBy(g => g.GradeName)
            .Select(MapToDto)
            .ToList();
    }

    /// <summary>
    /// Filters a list of grades to only those whose level falls within their school's
    /// configured grade range. Pre-warms the per-school range cache sequentially to avoid
    /// concurrent DbContext operations (EF Core does not support parallel queries on the
    /// same context instance). After the warm-up loop every per-grade check is a cache hit.
    /// </summary>
    private async Task<List<Grade>> FilterByAllowedLevelsAsync(List<Grade> grades, Guid? contextSchoolId = null)
    {
        if (grades.Count == 0) return grades;

        // Sequential pre-warm: one DB round-trip per distinct school the first time,
        // then cached for 30 min — safe with a single scoped DbContext.
        var schoolIds = grades.Select(g => g.SchoolId ?? contextSchoolId).Distinct().ToList();
        foreach (var sid in schoolIds)
        {
            await _gradeAccessService.IsLevelNumberAllowedAsync(sid, 1);
        }

        // All school ranges are now cached — zero additional DB calls in this loop.
        var visible = new List<Grade>(grades.Count);
        foreach (var g in grades)
        {
            var checkSchoolId = g.SchoolId ?? contextSchoolId;
            if (TryParseLevelNumber(g.GradeLevel, out var level)
                && await _gradeAccessService.IsLevelNumberAllowedAsync(checkSchoolId, level))
            {
                visible.Add(g);
            }
        }
        return visible;
    }

    private static bool TryParseLevelNumber(string? gradeLevel, out int levelNumber)
    {
        levelNumber = 0;
        if (string.IsNullOrWhiteSpace(gradeLevel)) return false;
        var match = System.Text.RegularExpressions.Regex.Match(gradeLevel, @"-?\d+");
        if (match.Success && int.TryParse(match.Value, out levelNumber))
        {
            return true;
        }
        return false;
    }

    /// <summary>
    /// Resolves the authoritative (GradeLevelId, LevelNumber, Name) tuple for a create/update
    /// request. GradeLevelId (the new, preferred field) wins when supplied; otherwise
    /// falls back to parsing the legacy GradeLevel string. Either way the result is
    /// validated against the live grade_levels master (via the cached GradeAccessService
    /// list) so a bogus/non-existent Id or an out-of-range number is rejected the same way.
    /// </summary>
    private async Task<(Guid GradeLevelId, int LevelNumber, string Name)> ResolveGradeLevelAsync(Guid? gradeLevelId, string? gradeLevelText)
    {
        var allLevels = await _gradeAccessService.GetAllGradeLevelsAsync();

        if (gradeLevelId.HasValue && gradeLevelId.Value != Guid.Empty)
        {
            var byId = allLevels.FirstOrDefault(l => l.Id == gradeLevelId.Value);
            if (byId == null)
            {
                throw new AppException("Grade level must be a standardized value between -1 and 10.");
            }
            return (byId.Id, byId.LevelNumber, byId.Name);
        }

        if (!TryParseLevelNumber(gradeLevelText, out var levelNumber))
        {
            throw new AppException("Grade level must be a standardized value between -1 and 10.");
        }

        var byNumber = allLevels.FirstOrDefault(l => l.LevelNumber == levelNumber);
        if (byNumber == null)
        {
            throw new AppException("Grade level must be a standardized value between -1 and 10.");
        }
        return (byNumber.Id, byNumber.LevelNumber, byNumber.Name);
    }

    private static GradeDto MapToDto(Grade g) => new GradeDto
    {
        Id = g.Id,
        SchoolId = g.SchoolId,
        SchoolName = g.School?.Name ?? "Global Grade",
        GradeLevelId = g.GradeLevelId,
        GradeLevel = g.GradeLevel,
        GradeName = g.GradeName,
        Capacity = g.Capacity,
        ClassTeacherId = g.ClassTeacherId,
        ClassTeacherName = g.ClassTeacher != null ? $"{g.ClassTeacher.FirstName} {g.ClassTeacher.LastName}" : null,
        ClassRoom = g.ClassRoom,
        AcademicYear = g.AcademicYear,
        IsActive = g.IsActive,
        StudentCount = g.Students?.Count ?? 0
    };
}
