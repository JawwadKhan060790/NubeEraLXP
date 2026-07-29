using System.Security.Claims;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Moq;
using NubeEra.Application.Interfaces.Security;
using NubeEra.Application.Services;
using NubeEra.Domain.Common;
using NubeEra.Domain.Entities;
using NubeEra.Infrastructure.Persistence.DbContext;
using NubeEra.Infrastructure.Repositories;
using Xunit;

namespace NubeEra.Tests.GradeManagement;

/// <summary>
/// Coverage for the centralized Grade Management standardization: the single
/// source of truth (<see cref="GradeAccessService"/> + <see cref="SchoolGradeRangeService"/>)
/// that every module (Students, Parents, Teachers, Attendance, Exams, Timetable,
/// Learning Modules, Events, Reports, ...) must resolve grade visibility through.
///
/// Scenarios exercised, per the standardization requirements:
///   - Full range (1-10), partial ranges (6-10, 1-5, 3-8)
///   - "No range configured" fails CLOSED (school cannot expose any grade)
///   - Numeric level allow/deny checks at and outside the configured boundary
///   - IDOR prevention: EnsureGradeAccessibleToCurrentUserAsync rejects a
///     manipulated GradeId that is (a) outside the grade's own school's range,
///     or (b) belonging to a different school than the current (school-scoped) user
///   - Platform roles (SuperAdmin/Admin) without a school context see the full master
///
/// Backed by EF Core's InMemory provider via the same GenericRepository<T> the
/// production services use — mirrors the convention established in BackupServiceTests.
/// </summary>
public class GradeAccessServiceTests : IDisposable
{
    private readonly List<AppDbContext> _contexts = new();

    public void Dispose()
    {
        foreach (var context in _contexts) context.Dispose();
    }

    // ------------------------------------------------------------------
    // Scaffolding
    // ------------------------------------------------------------------

    private AppDbContext CreateInMemoryContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        var context = new AppDbContext(options, currentUserService: null);
        _contexts.Add(context);
        return context;
    }

    private static Mock<ICurrentUserService> CreateCurrentUserMock(Guid? schoolId, string role)
    {
        var mock = new Mock<ICurrentUserService>();
        mock.SetupGet(x => x.UserId).Returns(Guid.NewGuid().ToString());
        mock.SetupGet(x => x.Role).Returns(role);
        mock.SetupGet(x => x.SchoolId).Returns(schoolId);
        mock.SetupGet(x => x.User).Returns(new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.Role, role),
        }, "TestAuth")));
        return mock;
    }

    /// <summary>Seeds the standardized -1 to 10 GradeLevel master list (mirrors GradeLevelConfiguration.HasData).</summary>
    private static List<GradeLevel> SeedGradeLevels(AppDbContext context)
    {
        var levels = new List<GradeLevel>
        {
            new GradeLevel { Id = Guid.Parse("00000000-0000-0000-0000-000000000012"), LevelNumber = -1, Name = "Boot Camp", DisplayOrder = 1, IsActive = true, CreatedAt = DateTime.UtcNow },
            new GradeLevel { Id = Guid.Parse("00000000-0000-0000-0000-000000000011"), LevelNumber = 0, Name = "Foundation Course", DisplayOrder = 2, IsActive = true, CreatedAt = DateTime.UtcNow }
        };
        for (var i = 1; i <= 10; i++)
        {
            levels.Add(new GradeLevel
            {
                Id = Guid.Parse($"00000000-0000-0000-0000-{i:D12}"),
                LevelNumber = i,
                Name = $"Grade {i}",
                DisplayOrder = i + 2,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });
        }
        context.GradeLevels.AddRange(levels);
        context.SaveChanges();
        return levels;
    }

    /// <summary>Creates a school configured with the given inclusive [from, to] standardized range (or no range when either bound is null).</summary>
    private static School SeedSchool(AppDbContext context, List<GradeLevel> levels, int? fromLevel, int? toLevel)
    {
        var school = new School
        {
            Id = Guid.NewGuid(),
            SchoolCode = $"SCH-{Guid.NewGuid():N}".Substring(0, 12),
            Name = "Test School",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            FromGradeId = fromLevel.HasValue ? levels.FirstOrDefault(l => l.LevelNumber == fromLevel.Value)?.Id : null,
            ToGradeId = toLevel.HasValue ? levels.FirstOrDefault(l => l.LevelNumber == toLevel.Value)?.Id : null
        };
        context.Schools.Add(school);
        context.SaveChanges();
        return school;
    }

    private static Grade SeedGrade(AppDbContext context, Guid schoolId, int levelNumber)
    {
        var grade = new Grade
        {
            Id = Guid.NewGuid(),
            SchoolId = schoolId,
            GradeLevel = levelNumber.ToString(),
            GradeName = $"Grade {levelNumber}",
            Capacity = 30,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        context.Grades.Add(grade);
        context.SaveChanges();
        return grade;
    }

    private GradeAccessService BuildService(AppDbContext context, ICurrentUserService currentUser)
    {
        var gradeLevelRepo = new GenericRepository<GradeLevel>(context);
        var gradeRepo = new GenericRepository<Grade>(context);
        var schoolRepo = new GenericRepository<School>(context);
        var cache = new MemoryCache(new MemoryCacheOptions());
        var rangeService = new SchoolGradeRangeService(schoolRepo, cache);

        var tenantService = new Mock<ITenantService>();
        tenantService.Setup(t => t.GetEffectiveSchoolId(It.IsAny<Guid?>()))
                     .Returns((Guid? id) => id ?? currentUser.SchoolId);
        tenantService.Setup(t => t.GetEffectiveSchoolIdOrEmpty(It.IsAny<Guid?>()))
                     .Returns((Guid? id) => id ?? currentUser.SchoolId ?? Guid.Empty);
        tenantService.Setup(t => t.IsSchoolRestrictedRole()).Returns(false);
        tenantService.Setup(t => t.CanSelectSchool()).Returns(true);

        return new GradeAccessService(gradeLevelRepo, gradeRepo, rangeService, currentUser, tenantService.Object, cache);
    }

    // ------------------------------------------------------------------
    // Scenario: Full range (1-10) — every standardized grade visible
    // ------------------------------------------------------------------

    [Fact]
    public async Task FullRange_minus1to10_AllStandardizedGradesAreVisible()
    {
        using var context = CreateInMemoryContext();
        var levels = SeedGradeLevels(context);
        var school = SeedSchool(context, levels, fromLevel: -1, toLevel: 10);
        var currentUser = CreateCurrentUserMock(school.Id, AppRoles.Principal).Object;
        var service = BuildService(context, currentUser);

        var allowed = await service.GetAllowedGradeLevelsAsync(school.Id);

        allowed.Should().HaveCount(12);
        allowed.Select(g => g.LevelNumber).Should().BeEquivalentTo(new[] { -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 });
    }

    // ------------------------------------------------------------------
    // Scenario: Partial ranges — 6-10, 1-5, 3-8
    // ------------------------------------------------------------------

    [Theory]
    [InlineData(6, 10, new[] { 6, 7, 8, 9, 10 })]
    [InlineData(1, 5, new[] { 1, 2, 3, 4, 5 })]
    [InlineData(3, 8, new[] { 3, 4, 5, 6, 7, 8 })]
    [InlineData(-1, 2, new[] { -1, 0, 1, 2 })]
    public async Task PartialRange_OnlyConfiguredGradesAreVisible_OthersHidden(int from, int to, int[] expectedLevels)
    {
        using var context = CreateInMemoryContext();
        var levels = SeedGradeLevels(context);
        var school = SeedSchool(context, levels, fromLevel: from, toLevel: to);
        var currentUser = CreateCurrentUserMock(school.Id, AppRoles.Teacher).Object;
        var service = BuildService(context, currentUser);

        var allowed = await service.GetAllowedGradeLevelsAsync(school.Id);

        allowed.Select(g => g.LevelNumber).Should().BeEquivalentTo(expectedLevels);
        var allPossible = new[] { -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 };
        allowed.Select(g => g.LevelNumber).Should().NotContain(allPossible.Except(expectedLevels));
    }

    // ------------------------------------------------------------------
    // Scenario: No / invalid range configured -> fail CLOSED (no grades exposed)
    // ------------------------------------------------------------------

    [Fact]
    public async Task NoGradeRangeConfigured_FailsClosed_ExposesNoGrades()
    {
        using var context = CreateInMemoryContext();
        var levels = SeedGradeLevels(context);
        var school = SeedSchool(context, levels, fromLevel: null, toLevel: null);
        var currentUser = CreateCurrentUserMock(school.Id, AppRoles.Student).Object;
        var service = BuildService(context, currentUser);

        var allowed = await service.GetAllowedGradeLevelsAsync(school.Id);

        allowed.Should().BeEmpty("a school without a valid configured range must never expose any grade — fail closed");
    }

    // ------------------------------------------------------------------
    // Scenario: Numeric level allow/deny at and outside the configured boundary
    // ------------------------------------------------------------------

    [Theory]
    [InlineData(6, 10, 6, true)]   // lower boundary — allowed
    [InlineData(6, 10, 10, true)]  // upper boundary — allowed
    [InlineData(6, 10, 5, false)]  // just below range — denied
    [InlineData(6, 10, 11, false)] // above standardized max — denied
    [InlineData(1, 5, 1, true)]
    [InlineData(1, 5, 6, false)]
    [InlineData(-1, 2, -1, true)]  // negative boundary - allowed
    [InlineData(-1, 2, -2, false)] // below negative boundary - denied
    [InlineData(-1, 2, 0, true)]   // 0 - allowed
    public async Task IsLevelNumberAllowed_RespectsConfiguredBoundaries(int from, int to, int probeLevel, bool expectedAllowed)
    {
        using var context = CreateInMemoryContext();
        var levels = SeedGradeLevels(context);
        var school = SeedSchool(context, levels, fromLevel: from, toLevel: to);
        var currentUser = CreateCurrentUserMock(school.Id, AppRoles.Staff).Object;
        var service = BuildService(context, currentUser);

        var isAllowed = await service.IsLevelNumberAllowedAsync(school.Id, probeLevel);

        isAllowed.Should().Be(expectedAllowed);
    }

    [Fact]
    public async Task EnsureLevelNumberAllowed_ThrowsForbidden_WhenLevelOutsideRange()
    {
        using var context = CreateInMemoryContext();
        var levels = SeedGradeLevels(context);
        var school = SeedSchool(context, levels, fromLevel: 6, toLevel: 10);
        var currentUser = CreateCurrentUserMock(school.Id, AppRoles.Staff).Object;
        var service = BuildService(context, currentUser);

        var act = async () => await service.EnsureLevelNumberAllowedAsync(school.Id, 3);

        await act.Should().ThrowAsync<GradeAccessForbiddenException>();
    }

    // ------------------------------------------------------------------
    // Scenario: IDOR prevention — manipulated GradeId rejected
    // ------------------------------------------------------------------

    [Fact]
    public async Task EnsureGradeAccessible_Throws_WhenGradeLevelOutsideItsOwnSchoolsRange()
    {
        using var context = CreateInMemoryContext();
        var levels = SeedGradeLevels(context);
        // School only supports 6th-10th, but somehow has (e.g. legacy) a Grade-1 row.
        var school = SeedSchool(context, levels, fromLevel: 6, toLevel: 10);
        var outOfRangeGrade = SeedGrade(context, school.Id, levelNumber: 1);

        var currentUser = CreateCurrentUserMock(school.Id, AppRoles.Teacher).Object;
        var service = BuildService(context, currentUser);

        var act = async () => await service.EnsureGradeAccessibleToCurrentUserAsync(outOfRangeGrade.Id);

        await act.Should().ThrowAsync<GradeAccessForbiddenException>(
            "a grade whose level falls outside its own school's configured range must never be reachable, even via a crafted GradeId");
    }

    [Fact]
    public async Task EnsureGradeAccessible_Throws_WhenGradeBelongsToAnotherSchool_BlocksIDOR()
    {
        using var context = CreateInMemoryContext();
        var levels = SeedGradeLevels(context);

        var ownSchool = SeedSchool(context, levels, fromLevel: 1, toLevel: 10);
        var otherSchool = SeedSchool(context, levels, fromLevel: 1, toLevel: 10);
        var otherSchoolsGrade = SeedGrade(context, otherSchool.Id, levelNumber: 5);

        // Current user (school-scoped, e.g. a Principal/Teacher) belongs to ownSchool,
        // but crafts a request referencing a perfectly valid GradeId from a DIFFERENT school.
        var currentUser = CreateCurrentUserMock(ownSchool.Id, AppRoles.Principal).Object;
        var service = BuildService(context, currentUser);

        var act = async () => await service.EnsureGradeAccessibleToCurrentUserAsync(otherSchoolsGrade.Id);

        await act.Should().ThrowAsync<GradeAccessForbiddenException>(
            "a school-scoped user must never be able to act on another school's grade via a manipulated GradeId (IDOR)");
    }

    [Fact]
    public async Task EnsureGradeAccessible_Succeeds_WhenGradeIsWithinOwnSchoolsConfiguredRange()
    {
        using var context = CreateInMemoryContext();
        var levels = SeedGradeLevels(context);
        var school = SeedSchool(context, levels, fromLevel: 3, toLevel: 8);
        var validGrade = SeedGrade(context, school.Id, levelNumber: 5);

        var currentUser = CreateCurrentUserMock(school.Id, AppRoles.Teacher).Object;
        var service = BuildService(context, currentUser);

        var act = async () => await service.EnsureGradeAccessibleToCurrentUserAsync(validGrade.Id);

        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task EnsureGradeAccessible_Throws_WhenGradeMissingFromCurrentSchoolRange_AfterRangeNarrowed()
    {
        // Simulates: school previously supported 1-10 (grade existed), then range was
        // narrowed to 6-10. The old Grade-2 row must become inaccessible everywhere.
        using var context = CreateInMemoryContext();
        var levels = SeedGradeLevels(context);
        var school = SeedSchool(context, levels, fromLevel: 6, toLevel: 10);
        var legacyGrade = SeedGrade(context, school.Id, levelNumber: 2);

        var currentUser = CreateCurrentUserMock(school.Id, AppRoles.Parent).Object;
        var service = BuildService(context, currentUser);

        var act = async () => await service.EnsureGradeAccessibleToCurrentUserAsync(legacyGrade.Id);

        await act.Should().ThrowAsync<GradeAccessForbiddenException>();
    }

    // ------------------------------------------------------------------
    // Scenario: Platform roles (SuperAdmin/Admin) without a school context
    // ------------------------------------------------------------------

    [Fact]
    public async Task PlatformRole_WithoutSchoolContext_SeesFullStandardizedMasterList()
    {
        using var context = CreateInMemoryContext();
        SeedGradeLevels(context);
        var currentUser = CreateCurrentUserMock(schoolId: null, role: AppRoles.SuperAdmin).Object;
        var service = BuildService(context, currentUser);

        var allowed = await service.GetAllowedGradeLevelsForCurrentUserAsync();

        allowed.Should().HaveCount(12);
    }

    [Fact]
    public async Task SchoolScopedRole_SeesOnlyTheirSchoolsConfiguredRange_ViaCurrentUserResolution()
    {
        using var context = CreateInMemoryContext();
        var levels = SeedGradeLevels(context);
        var school = SeedSchool(context, levels, fromLevel: 1, toLevel: 5);
        var currentUser = CreateCurrentUserMock(school.Id, AppRoles.Student).Object;
        var service = BuildService(context, currentUser);

        var allowed = await service.GetAllowedGradeLevelsForCurrentUserAsync();

        allowed.Select(g => g.LevelNumber).Should().BeEquivalentTo(new[] { 1, 2, 3, 4, 5 });
    }
}
