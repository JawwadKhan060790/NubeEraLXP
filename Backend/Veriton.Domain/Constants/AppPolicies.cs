namespace Veriton.Domain.Constants;

/// <summary>
/// Authorization policy name constants.
/// Single source of truth for all policy strings used in
/// <c>[Authorize(Policy = "...")]</c> attributes and AddAuthorization() setup.
/// </summary>
public static class AppPolicies
{
    /// <summary>SuperAdmin and Admin only.</summary>
    public const string AdminOnly = "AdminOnly";

    /// <summary>SuperAdmin, Admin, Staff.</summary>
    public const string StaffOnly = "StaffOnly";

    /// <summary>SuperAdmin, Admin, Staff, Principal.</summary>
    public const string PrincipalOnly = "PrincipalOnly";

    /// <summary>SuperAdmin, Admin, Staff, Principal, Teacher.</summary>
    public const string TeacherOnly = "TeacherOnly";

    /// <summary>All authenticated roles including Student.</summary>
    public const string StudentOnly = "StudentOnly";

    /// <summary>SuperAdmin, Admin, Parent.</summary>
    public const string ParentOnly = "ParentOnly";
}
