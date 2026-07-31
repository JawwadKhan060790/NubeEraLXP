using Veriton.Application.Common;
using Veriton.Application.Interfaces.Security;
using Veriton.Domain.Common;

namespace Veriton.Infrastructure.Security;

/// <summary>
/// Implements <see cref="ITenantService"/>.
/// Resolves the effective SchoolId for every inbound request based on the caller's role
/// and the school selected in the frontend UI (forwarded as <c>X-School-Id</c> header).
/// </summary>
public sealed class TenantService : ITenantService
{
    /// <summary>Roles that are always locked to their JWT-embedded SchoolId.</summary>
    private static readonly HashSet<string> SchoolRestrictedRoles =
        new(StringComparer.OrdinalIgnoreCase)
        {
            AppRoles.Parent,
            AppRoles.Student,
            AppRoles.Principal,
            AppRoles.Teacher,
        };

    /// <summary>
    /// Platform-wide roles that see ALL schools by default.
    /// They never fall back to a JWT-embedded SchoolId — when no school is explicitly
    /// selected via X-School-Id, <see cref="GetEffectiveSchoolId"/> returns null,
    /// which services interpret as "no school filter → show all data".
    /// </summary>
    private static readonly HashSet<string> PlatformWideRoles =
        new(StringComparer.OrdinalIgnoreCase)
        {
            AppRoles.SuperAdmin,
            AppRoles.Admin,
            AppRoles.Staff,
        };

    private readonly ICurrentUserService _currentUserService;
    private readonly TenantContext       _tenantContext;

    public TenantService(ICurrentUserService currentUserService, TenantContext tenantContext)
    {
        _currentUserService = currentUserService;
        _tenantContext       = tenantContext;
    }

    /// <inheritdoc/>
    public bool IsSchoolRestrictedRole()
        => SchoolRestrictedRoles.Contains(_currentUserService.Role ?? string.Empty);

    /// <inheritdoc/>
    public bool CanSelectSchool() => !IsSchoolRestrictedRole();

    /// <inheritdoc/>
    public Guid? GetEffectiveSchoolId(Guid? bodySchoolId = null)
    {
        var role = _currentUserService.Role ?? string.Empty;

        // Teacher: may now belong to MULTIPLE schools (see TeacherSchools join table) and
        // switch between them via the frontend school selector. The explicitly requested
        // school (X-School-Id header / school_id query param, validated against the
        // Teacher's own TeacherSchools memberships by TeacherSchoolAccessMiddleware) wins;
        // otherwise fall back to the JWT-embedded home school exactly as before.
        //
        // IMPORTANT — this only controls which school's DATA a Teacher reads/sees through
        // the global query filters. It is intentionally separate from CanSelectSchool(),
        // which governs whether a caller may reassign an ENTITY's SchoolId via a request
        // body (e.g. StudentService.UpdateAsync, UsersController.Update). Teacher must
        // remain in SchoolRestrictedRoles below so CanSelectSchool() stays false for
        // Teacher and that body-supplied-SchoolId reassignment path stays locked down.
        if (string.Equals(role, AppRoles.Teacher, StringComparison.OrdinalIgnoreCase))
        {
            var explicitTeacherSchool = bodySchoolId ?? _tenantContext.RequestedSchoolId;
            return explicitTeacherSchool ?? _currentUserService.SchoolId;
        }

        // Other restricted roles (Principal, Student, Parent) always use their JWT school.
        if (IsSchoolRestrictedRole())
            return _currentUserService.SchoolId;

        var explicitSchool = bodySchoolId ?? _tenantContext.RequestedSchoolId;

        // Platform-wide roles (SuperAdmin, Admin, Staff): only filter when a school is
        // explicitly selected via X-School-Id header. No header → null → all data visible.
        if (PlatformWideRoles.Contains(role))
            return explicitSchool;

        return explicitSchool ?? _currentUserService.SchoolId;
    }

    /// <inheritdoc/>
    public Guid GetEffectiveSchoolIdOrEmpty(Guid? bodySchoolId = null)
        => GetEffectiveSchoolId(bodySchoolId) ?? Guid.Empty;
}
