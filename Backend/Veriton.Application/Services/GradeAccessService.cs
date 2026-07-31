using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Veriton.Application.DTOs;
using Veriton.Application.Interfaces.Repositories;
using Veriton.Application.Interfaces.Security;
using Veriton.Application.Interfaces.Services;
using Veriton.Domain.Common;
using Veriton.Domain.Entities;

namespace Veriton.Application.Services;

/// <summary>
/// Single source of truth for grade visibility across the entire application.
/// See <see cref="IGradeAccessService"/> for the full contract / usage contract.
/// No module should implement its own grade filtering — call into this service instead.
/// </summary>
public class GradeAccessService : IGradeAccessService
{
    private const string AllLevelsCacheKey = "grade-levels:master-list";
    private static readonly TimeSpan MasterListCacheDuration = TimeSpan.FromHours(6);

    private static readonly string[] PlatformRoles = { AppRoles.SuperAdmin, AppRoles.Admin };

    private readonly IGenericRepository<GradeLevel> _gradeLevelRepository;
    private readonly IGenericRepository<Grade> _gradeRepository;
    private readonly ISchoolGradeRangeService _schoolGradeRangeService;
    private readonly ICurrentUserService _currentUserService;
    private readonly ITenantService       _tenantService;
    private readonly IMemoryCache _cache;

    public GradeAccessService(
        IGenericRepository<GradeLevel> gradeLevelRepository,
        IGenericRepository<Grade> gradeRepository,
        ISchoolGradeRangeService schoolGradeRangeService,
        ICurrentUserService currentUserService,
        ITenantService tenantService,
        IMemoryCache cache)
    {
        _gradeLevelRepository = gradeLevelRepository;
        _gradeRepository = gradeRepository;
        _schoolGradeRangeService = schoolGradeRangeService;
        _currentUserService = currentUserService;
        _tenantService       = tenantService;
        _cache = cache;
    }

    public async Task<List<GradeLevelDto>> GetAllGradeLevelsAsync()
    {
        if (_cache.TryGetValue<List<GradeLevelDto>>(AllLevelsCacheKey, out var cached) && cached != null)
        {
            return cached;
        }

        var levels = await _gradeLevelRepository.GetAllAsync(q => q.Where(g => g.IsActive).OrderBy(g => g.DisplayOrder));
        var dtos = levels.Select(MapToDto).ToList();

        _cache.Set(AllLevelsCacheKey, dtos, MasterListCacheDuration);
        return dtos;
    }

    public async Task<List<GradeLevelDto>> GetAllowedGradeLevelsAsync(Guid? schoolId)
    {
        var all = await GetAllGradeLevelsAsync();

        if (schoolId == null)
        {
            // Platform-wide / unscoped context (e.g. SuperAdmin browsing without a school
            // filter, or School create form before a school exists yet): full master list.
            return all;
        }

        var range = await _schoolGradeRangeService.GetRangeAsync(schoolId.Value);
        if (range == null)
        {
            // Fail closed: a school with no valid grade range configured shows NO grades,
            // matching the rule "School cannot be activated without valid grade range configuration".
            return new List<GradeLevelDto>();
        }

        return all.Where(g => g.LevelNumber >= range.From && g.LevelNumber <= range.To).ToList();
    }

    public async Task<List<GradeLevelDto>> GetAllowedGradeLevelsForCurrentUserAsync()
    {
        var role = _currentUserService.Role ?? string.Empty;
        // Non-restricted roles (SuperAdmin/Admin/Staff/Teacher) use the school
        // selected via the UI; restricted roles always use their JWT school.
        var schoolId = _tenantService.GetEffectiveSchoolId();

        if (schoolId == null)
        {
            // No school selected — SuperAdmin/Admin without a filter see the full master list.
            return await GetAllGradeLevelsAsync();
        }

        return await GetAllowedGradeLevelsAsync(schoolId);
    }

    public async Task<bool> IsLevelNumberAllowedAsync(Guid? schoolId, int levelNumber)
    {
        if (levelNumber < -1 || levelNumber > 10)
        {
            return false;
        }

        if (schoolId == null)
        {
            // Platform-wide context: any standardized level (1-12) is permitted.
            return true;
        }

        var range = await _schoolGradeRangeService.GetRangeAsync(schoolId.Value);
        if (range == null)
        {
            return false; // fail closed
        }

        return levelNumber >= range.From && levelNumber <= range.To;
    }

    public async Task EnsureLevelNumberAllowedAsync(Guid? schoolId, int levelNumber)
    {
        if (!await IsLevelNumberAllowedAsync(schoolId, levelNumber))
        {
            throw new GradeAccessForbiddenException(
                $"Grade level {levelNumber} is outside the allowed grade range for this school.");
        }
    }

    public async Task EnsureGradeAccessibleToCurrentUserAsync(Guid gradeId)
    {
        var grade = await _gradeRepository.GetByIdAsync(gradeId);
        if (grade == null)
        {
            // Let the caller surface a 404 — there is nothing to authorize against.
            return;
        }

        var role = _currentUserService.Role ?? string.Empty;
        // Skip school-scoped check for admin, teacher, staff, and super admin roles.
        var skipSchoolCheckRoles = new[] { AppRoles.SuperAdmin, AppRoles.Admin, AppRoles.Teacher, AppRoles.Staff };
        var isPrivileged = skipSchoolCheckRoles.Contains(role, StringComparer.OrdinalIgnoreCase);

        if (!TryParseLevelNumber(grade.GradeLevel, out var levelNumber))
        {
            // Legacy/non-standard grade level value (e.g. migrated "KG"/blank data).
            // Fail CLOSED for restricted roles (Student/Parent/Principal) who could
            // otherwise be probing for another school's data, but fail OPEN for
            // privileged staff roles — denying Admin/Teacher/Staff access to legacy
            // attendance/grade records is itself the bug reported as "attendance
            // fails to load", not a security improvement.
            if (isPrivileged) return;
            throw new GradeAccessForbiddenException("This grade does not use a standardized grade level and cannot be accessed.");
        }

        var currentSchoolId = _tenantService.GetEffectiveSchoolId();

        // 1) The grade's level must fall within ITS OWN school's configured range (or context school if global).
        var checkSchoolId = grade.SchoolId ?? currentSchoolId;
        await EnsureLevelNumberAllowedAsync(checkSchoolId, levelNumber);

        // 2) If the current user is school-scoped, the grade must belong to that same school or be global.
        if (!isPrivileged && currentSchoolId.HasValue && grade.SchoolId != null && grade.SchoolId != currentSchoolId.Value)
        {
            throw new GradeAccessForbiddenException("You do not have access to grades belonging to another school.");
        }
    }

    private static bool IsPlatformRole(string role)
        => PlatformRoles.Any(r => r.Equals(role, StringComparison.OrdinalIgnoreCase));

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

    private static GradeLevelDto MapToDto(GradeLevel g) => new()
    {
        Id = g.Id,
        LevelNumber = g.LevelNumber,
        Name = g.Name,
        DisplayOrder = g.DisplayOrder
    };
}
