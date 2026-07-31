using Microsoft.EntityFrameworkCore.Infrastructure;

namespace Veriton.Infrastructure.Persistence.DbContext;

/// <summary>
/// Forces EF Core to build (and cache) a distinct compiled model per distinct
/// user/tenant identity, instead of the default behavior of building the model
/// ONCE per DbContext type for the lifetime of the process.
///
/// <see cref="AppDbContext.OnModelCreating"/> defines its global query filters
/// (school/grade/student/teacher scoping — including the Curriculum Assignment
/// gating for Module/Lesson) by closing over values read from the current
/// request's <c>ICurrentUserService</c>/<c>ITenantService</c>. Those are local
/// variables, not members read off <c>this</c>, so EF Core's default
/// <see cref="IModelCacheKeyFactory"/> (which keys purely on the DbContext
/// type) cannot tell that two requests need different filters: the very first
/// request to ever trigger model building "wins," and every later request —
/// regardless of which user or school is actually making it — silently reuses
/// that first request's frozen filters until the process restarts.
///
/// Keying the cache on the same identity values OnModelCreating reads (exposed
/// via the internal ModelCache* properties on <see cref="AppDbContext"/>)
/// makes EF rebuild the model whenever it sees a combination it hasn't cached
/// yet, and reuse the cached one otherwise — restoring per-request correctness
/// without touching the filter logic itself.
///
/// Trade-off: the cache now holds one compiled model per distinct identity
/// combination ever seen (worst case: roughly one per active student/teacher),
/// rather than a single shared model. Acceptable for this app's current scale;
/// revisit with DbContext-instance-member-based filters (no extra models) if
/// the user/school count grows large enough for this to matter.
/// </summary>
public sealed class TenantModelCacheKeyFactory : IModelCacheKeyFactory
{
    public object Create(Microsoft.EntityFrameworkCore.DbContext context, bool designTime)
        => context is AppDbContext appDbContext
            ? (
                context.GetType(),
                designTime,
                appDbContext.ModelCacheRole,
                appDbContext.ModelCacheSchoolId,
                appDbContext.ModelCacheTeacherId,
                appDbContext.ModelCacheStudentId,
                appDbContext.ModelCacheGradeId,
                appDbContext.ModelCacheGradeLevelId,
                appDbContext.ModelCacheUserId
              )
            : (object)(context.GetType(), designTime);

    public object Create(Microsoft.EntityFrameworkCore.DbContext context)
        => Create(context, false);
}
