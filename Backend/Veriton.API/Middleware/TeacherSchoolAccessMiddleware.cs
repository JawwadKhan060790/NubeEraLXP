using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Veriton.Application.Common;
using Veriton.Application.Interfaces.Security;
using Veriton.Domain.Common;
using Veriton.Infrastructure.Persistence.DbContext;

namespace Veriton.API.Middleware;

/// <summary>
/// Enforces Requirement 8 (security) for the School-Based Curriculum Assignment /
/// Multi-School Teacher Management feature: a Teacher may only request data scoped to
/// a school they are actively assigned to via the <c>TeacherSchools</c> join table.
///
/// Ordering matters: this MUST run AFTER <c>app.UseAuthorization()</c> so that
/// <c>context.User</c> claims (and therefore <see cref="ICurrentUserService"/>) are
/// populated — unlike <c>TenantMiddleware</c>, which deliberately runs before
/// authentication and only parses the raw <c>X-School-Id</c> header into
/// <see cref="TenantContext"/>. This middleware is the one that actually validates that
/// requested school against the caller's identity, and must run before
/// <c>app.MapControllers()</c> so it can short-circuit the request.
///
/// If the caller is a Teacher AND has explicitly selected a school (X-School-Id header or
/// school_id query param, captured earlier by TenantMiddleware into
/// TenantContext.RequestedSchoolId), this verifies an active, non-deleted TeacherSchools
/// row exists for (TeacherId, RequestedSchoolId). If not, the request is short-circuited
/// with HTTP 403 before reaching any controller.
///
/// Non-Teacher roles, and Teacher requests with no explicit school selection (i.e. using
/// their JWT home school via ITenantService's fallback), are unaffected here — those paths
/// remain protected by the existing global query filters in AppDbContext. This middleware
/// is additive defense-in-depth on top of those filters, not a replacement for them.
/// </summary>
public sealed class TeacherSchoolAccessMiddleware
{
    private readonly RequestDelegate _next;

    public TeacherSchoolAccessMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(
        HttpContext context,
        ICurrentUserService currentUserService,
        TenantContext tenantContext,
        AppDbContext dbContext)
    {
        var role = currentUserService.Role;
        var requestedSchoolId = tenantContext.RequestedSchoolId;

        if (string.Equals(role, AppRoles.Teacher, StringComparison.OrdinalIgnoreCase)
            && requestedSchoolId.HasValue
            && currentUserService.TeacherId.HasValue)
        {
            var teacherId = currentUserService.TeacherId.Value;
            var schoolId = requestedSchoolId.Value;

            // IgnoreQueryFilters: the global query filters for TeacherSchool already
            // restrict a Teacher to their own rows, but at the point this middleware
            // runs we want an explicit, unambiguous check independent of filter wiring.
            var hasAccess = await dbContext.TeacherSchools
                .IgnoreQueryFilters()
                .AnyAsync(ts => !ts.IsDeleted && ts.IsActive
                    && ts.TeacherId == teacherId && ts.SchoolId == schoolId);

            if (!hasAccess)
            {
                context.Response.StatusCode = (int)HttpStatusCode.Forbidden;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync(JsonSerializer.Serialize(new
                {
                    message = "You are not assigned to the requested school."
                }));
                return; // Short-circuit — do not call _next.
            }
        }

        await _next(context);
    }
}
