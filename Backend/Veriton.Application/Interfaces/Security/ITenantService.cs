namespace Veriton.Application.Interfaces.Security;

/// <summary>
/// Centralized multi-tenant school resolver.
///
/// Business rules:
///   School-restricted roles (Parent, Student, Principal)  → always use their JWT-embedded SchoolId.
///   Non-restricted roles  (SuperAdmin, Admin, Staff, Teacher) → use the school selected in the UI
///   (forwarded as X-School-Id header), falling back to their JWT SchoolId, then null.
///
/// Priority for non-restricted roles: bodySchoolId → X-School-Id header → JWT SchoolId → null.
/// </summary>
public interface ITenantService
{
    /// <summary>
    /// Returns the effective SchoolId for the current request.
    /// <paramref name="bodySchoolId"/> is an optional value from the request body (e.g. a create DTO).
    /// It is only honoured for non-restricted roles.
    /// </summary>
    Guid? GetEffectiveSchoolId(Guid? bodySchoolId = null);

    /// <summary>
    /// Returns <see cref="GetEffectiveSchoolId"/> coalesced to <see cref="Guid.Empty"/>.
    /// Use when a non-nullable Guid is required (e.g. new entity creation).
    /// </summary>
    Guid GetEffectiveSchoolIdOrEmpty(Guid? bodySchoolId = null);

    /// <summary>True if the current role may select an arbitrary school from the UI dropdown.</summary>
    bool CanSelectSchool();

    /// <summary>True if the current role is restricted to only their own school (Parent, Student, Principal).</summary>
    bool IsSchoolRestrictedRole();
}
