namespace NubeEra.Application.Common;

/// <summary>
/// Scoped per-request container populated by <c>TenantMiddleware</c>.
/// Holds the school explicitly selected by the current user in the frontend UI.
/// Only meaningful for non-restricted roles; ignored for Parent / Student / Principal.
/// </summary>
public sealed class TenantContext
{
    /// <summary>
    /// The SchoolId sent by the frontend via the <c>X-School-Id</c> HTTP header.
    /// Null when the user has not selected a school (e.g. SuperAdmin seeing all data).
    /// </summary>
    public Guid? RequestedSchoolId { get; set; }
}
