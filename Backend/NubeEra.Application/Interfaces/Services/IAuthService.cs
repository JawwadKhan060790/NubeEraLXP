using NubeEra.Application.DTOs;

namespace NubeEra.Application.Interfaces.Services;

/// <summary>
/// Authentication and account management service contract.
/// Keeps all auth business logic out of the controller.
/// </summary>
public interface IAuthService
{
    /// <summary>Validates credentials and returns a JWT token + user summary.</summary>
    Task<LoginResponseDto> LoginAsync(LoginRequestDto request);

    /// <summary>Registers a new user with the given role.</summary>
    Task<Guid> RegisterAsync(RegisterRequestDto request);

    /// <summary>Verifies the current password and sets a new one.</summary>
    Task ChangePasswordAsync(Guid userId, ChangePasswordRequestDto request);

    /// <summary>Issues an OTP and delivers it via email (best-effort).</summary>
    Task ForgotPasswordAsync(ForgotPasswordRequestDto request);

    /// <summary>Validates the OTP and resets the user's password.</summary>
    Task ResetPasswordAsync(ResetPasswordRequestDto request);

    /// <summary>Returns the full profile for the authenticated user.</summary>
    Task<UserProfileDto> GetProfileAsync(Guid userId);
}
