namespace NubeEra.Application.DTOs;

// ─────────────────────────────────────────────────────────────────────────────
// Authentication Response DTOs
// ─────────────────────────────────────────────────────────────────────────────

/// <summary>Returned by the login endpoint on success.</summary>
public class LoginResponseDto
{
    /// <summary>JWT bearer token — include as <c>Authorization: Bearer {token}</c>.</summary>
    public string Token { get; set; } = string.Empty;

    /// <summary>Slim user summary embedded in the login response to avoid a second round-trip.</summary>
    public UserProfileDto User { get; set; } = new();
}

/// <summary>Full user profile. Returned by <c>GET /api/auth/me</c> and embedded in login responses.</summary>
public class UserProfileDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string FullName => $"{FirstName} {LastName}".Trim();
    public string Role { get; set; } = string.Empty;

    /// <summary>
    /// Normalized role alias used by the frontend ("admin", "principal", "teacher", "student", "parent").
    /// </summary>
    public string UType { get; set; } = string.Empty;

    public Guid? SchoolId { get; set; }
    public string? SchoolName { get; set; }
    public Guid? TeacherId { get; set; }
    public Guid? StudentId { get; set; }
    public Guid? GradeId { get; set; }
    public string? Phone { get; set; }
    public string? ProfileImageUrl { get; set; }
    public bool IsActive { get; set; }
}
