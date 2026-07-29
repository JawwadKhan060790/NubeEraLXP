using Microsoft.AspNetCore.Http;
using NubeEra.Application.Common;

namespace NubeEra.API.Middleware;

/// <summary>
/// Reads the <c>X-School-Id</c> HTTP header (or <c>school_id</c> query parameter)
/// and stores it in the scoped <see cref="TenantContext"/> for the current request.
///
/// This runs early in the pipeline so every downstream service and controller
/// can call <c>ITenantService.GetEffectiveSchoolId()</c> without worrying about
/// where the value comes from.
/// </summary>
public sealed class TenantMiddleware
{
    private readonly RequestDelegate _next;

    public TenantMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, TenantContext tenantContext)
    {
        // Header takes priority; query string is the fallback
        var raw = context.Request.Headers["X-School-Id"].FirstOrDefault()
               ?? context.Request.Query["school_id"].FirstOrDefault();

        if (Guid.TryParse(raw, out var schoolId))
            tenantContext.RequestedSchoolId = schoolId;

        await _next(context);
    }
}
