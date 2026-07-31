using System.Security.Claims;
using Veriton.Domain.Constants;

namespace Veriton.API.Extensions;

/// <summary>
/// Registers all role-based authorization policies.
/// Policy names are sourced from <see cref="AppPolicies"/> — the single source of truth.
/// Each policy uses a hierarchical role list so higher-privilege roles inherit access.
/// </summary>
public static class AuthorizationPoliciesExtensions
{
    public static IServiceCollection AddAuthorizationPolicies(this IServiceCollection services)
    {
        services.AddAuthorization(options =>
        {
            // ── AdminOnly: Super-admins and school admins ────────────────────
            options.AddPolicy(AppPolicies.AdminOnly, policy =>
                policy.RequireAssertion(ctx => HasAnyRole(ctx,
                    "SuperAdmin", "Admin", "admin")));

            // ── StaffOnly: Admin + Staff ─────────────────────────────────────
            options.AddPolicy(AppPolicies.StaffOnly, policy =>
                policy.RequireAssertion(ctx => HasAnyRole(ctx,
                    "SuperAdmin", "Admin", "admin", "Staff", "staff")));

            // ── PrincipalOnly: Admin + Staff + Principal ─────────────────────
            options.AddPolicy(AppPolicies.PrincipalOnly, policy =>
                policy.RequireAssertion(ctx => HasAnyRole(ctx,
                    "SuperAdmin", "Admin", "admin", "Staff", "staff",
                    "Principal", "principal")));

            // ── TeacherOnly: Admin + Staff + Principal + Teacher ─────────────
            options.AddPolicy(AppPolicies.TeacherOnly, policy =>
                policy.RequireAssertion(ctx => HasAnyRole(ctx,
                    "SuperAdmin", "Admin", "admin", "Staff", "staff",
                    "Principal", "principal", "Teacher", "teacher")));

            // ── StudentOnly: All staff roles + Student ───────────────────────
            options.AddPolicy(AppPolicies.StudentOnly, policy =>
                policy.RequireAssertion(ctx => HasAnyRole(ctx,
                    "SuperAdmin", "Admin", "admin", "Staff", "staff",
                    "Principal", "principal", "Teacher", "teacher",
                    "Student", "student")));

            // ── ParentOnly: Admin + Parent ───────────────────────────────────
            options.AddPolicy(AppPolicies.ParentOnly, policy =>
                policy.RequireAssertion(ctx => HasAnyRole(ctx,
                    "SuperAdmin", "Admin", "admin", "Parent", "parent")));
        });

        return services;
    }

    // ────────────────────────────────────────────────────────────────────────
    // Helpers
    // ────────────────────────────────────────────────────────────────────────

    private static bool HasAnyRole(
        Microsoft.AspNetCore.Authorization.AuthorizationHandlerContext ctx,
        params string[] roles)
    {
        if (ctx?.User == null) return false;

        return ctx.User.HasClaim(c =>
            (c.Type == ClaimTypes.Role || c.Type == "role" || c.Type == "utype" || c.Type.EndsWith("/role")) &&
            roles.Contains(c.Value, StringComparer.OrdinalIgnoreCase)) ||
               roles.Any(r => ctx.User.IsInRole(r));
    }
}
