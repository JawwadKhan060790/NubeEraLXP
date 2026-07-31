namespace Veriton.Domain.Common;

/// <summary>
/// Role constants matching the school operational hierarchy.
/// </summary>
public static class AppRoles
{
    public const string SuperAdmin = "SuperAdmin";
    public const string Admin = "Admin";
    public const string Staff = "Staff";
    public const string Principal = "Principal";
    public const string Teacher = "Teacher";
    public const string Student = "Student";
    public const string Parent = "Parent";

    /// <summary>
    /// Roles that can perform administrative operations.
    /// </summary>
    public const string AdminAndAbove = $"{SuperAdmin},{Admin}";

    /// <summary>
    /// Roles that manage curriculum: Principal creates Grades and Modules.
    /// </summary>
    public const string PrincipalAndAbove = $"{SuperAdmin},{Admin},{Staff},{Principal}";

    /// <summary>
    /// Roles that manage classroom content: Teacher creates Lessons, Students, Exams, etc.
    /// </summary>
    public const string TeacherAndAbove = $"{SuperAdmin},{Admin},{Staff},{Principal},{Teacher}";

    /// <summary>
    /// All authenticated roles.
    /// </summary>
    public const string AllRoles = $"{SuperAdmin},{Admin},{Staff},{Principal},{Teacher},{Student},{Parent}";
}
