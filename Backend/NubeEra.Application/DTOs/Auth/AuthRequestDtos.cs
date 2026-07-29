namespace NubeEra.Application.DTOs;

// ─────────────────────────────────────────────────────────────────────────────
// Authentication Request DTOs
// Moved out of AuthController so they live in the Application layer alongside
// all other module DTOs. Namespace kept as NubeEra.Application.DTOs so no
// using statements need to change in controllers or services.
// ─────────────────────────────────────────────────────────────────────────────

/// <summary>Credentials for the login endpoint.</summary>
public class LoginRequestDto
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

/// <summary>New user self-registration payload.</summary>
public class RegisterRequestDto
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    /// <summary>Defaults to "Student" when not supplied.</summary>
    public string? Role { get; set; } = "Student";
}

/// <summary>Payload to change the authenticated user's own password.</summary>
public class ChangePasswordRequestDto
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

/// <summary>Triggers an OTP email for a forgotten password.</summary>
public class ForgotPasswordRequestDto
{
    public string Email { get; set; } = string.Empty;
}

/// <summary>Validates an OTP and sets a new password.</summary>
public class ResetPasswordRequestDto
{
    public string Email { get; set; } = string.Empty;
    public string Otp { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}
