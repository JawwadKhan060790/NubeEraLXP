using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using NubeEra.Application.Interfaces.Repositories;
using NubeEra.Application.Interfaces.Services;
using NubeEra.Domain.Entities;

namespace NubeEra.Application.Services;

/// <summary>
/// Caches and resolves each school's configured grade range (FromGradeId/ToGradeId ->
/// numeric LevelNumber bounds). See <see cref="ISchoolGradeRangeService"/> for contract docs.
/// </summary>
public class SchoolGradeRangeService : ISchoolGradeRangeService
{
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(30);

    private readonly IGenericRepository<School> _schoolRepository;
    private readonly IMemoryCache _cache;

    public SchoolGradeRangeService(IGenericRepository<School> schoolRepository, IMemoryCache cache)
    {
        _schoolRepository = schoolRepository;
        _cache = cache;
    }

    private static string CacheKey(Guid schoolId) => $"school-grade-range:{schoolId}";

    public async Task<GradeRange?> GetRangeAsync(Guid schoolId)
    {
        if (_cache.TryGetValue<GradeRange?>(CacheKey(schoolId), out var cached))
        {
            return cached;
        }

        var school = await _schoolRepository.GetByIdAsync(
            schoolId,
            q => q.Include(s => s.FromGrade).Include(s => s.ToGrade));

        GradeRange? range = null;
        if (school?.FromGrade != null && school.ToGrade != null)
        {
            var from = Math.Min(school.FromGrade.LevelNumber, school.ToGrade.LevelNumber);
            var to = Math.Max(school.FromGrade.LevelNumber, school.ToGrade.LevelNumber);
            range = new GradeRange(from, to);
        }

        _cache.Set(CacheKey(schoolId), range, CacheDuration);
        return range;
    }

    public void InvalidateCache(Guid schoolId) => _cache.Remove(CacheKey(schoolId));
}
