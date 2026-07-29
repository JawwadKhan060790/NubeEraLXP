using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.Extensions.Caching.Memory;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Repositories;
using NubeEra.Application.Interfaces.Security;
using NubeEra.Domain.Entities;

namespace NubeEra.API.Controllers.Auth;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IUserRepository _userRepository;
    private readonly IJwtTokenService _jwtService;
    private readonly IMemoryCache _cache;
    private readonly IGenericRepository<Role> _roleRepository;
    private readonly NubeEra.Application.Interfaces.Services.Email.IEmailService _emailService;

    public AuthController(
        IUserRepository userRepository,
        IJwtTokenService jwtService,
        IMemoryCache cache,
        IGenericRepository<Role> roleRepository,
        NubeEra.Application.Interfaces.Services.Email.IEmailService emailService)
    {
        _userRepository = userRepository;
        _jwtService = jwtService;
        _cache = cache;
        _roleRepository = roleRepository;
        _emailService = emailService;
    }

    [HttpPut("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequestDto request)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                        ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
                        
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();

        var user = await _userRepository.GetByIdAsync(Guid.Parse(userIdStr));
        if (user == null) return NotFound();

        // Verify current password
        if (!SafeVerify(request.CurrentPassword, user.PasswordHash))
        {
            return BadRequest(new { message = "Invalid current password" });
        }

        // Hash and update new password
        var newHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.UpdatePassword(newHash);

        await _userRepository.UpdateAsync(user);
        return Ok(new { message = "Password changed successfully" });
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register(RegisterRequestDto request)
    {
        var existingUser = await _userRepository.GetByEmailAsync(request.Email.Trim().ToLower());
        if (existingUser != null)
        {
            return BadRequest(new { message = "User with this email already exists." });
        }

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password.Trim());
        var roleName = request.Role ?? "Student"; // Default to Student or User role
        
        var roleObj = (await _roleRepository.GetAllAsync(q => q.Where(r => r.RoleName == roleName))).FirstOrDefault();
        if (roleObj == null)
        {
            // Fallback: if "User" role is requested but doesn't exist, search "Student" or default standard role
            roleObj = (await _roleRepository.GetAllAsync(q => q.Where(r => r.RoleName == "Student"))).FirstOrDefault()
                ?? throw new Exception("Default Student role not found in database.");
        }

        var newUser = new Domain.Entities.User(
            request.Email.Trim().ToLower(),
            passwordHash,
            roleObj.Id
        );
        
        if (!string.IsNullOrEmpty(request.FirstName)) newUser.FirstName = request.FirstName;
        if (!string.IsNullOrEmpty(request.LastName)) newUser.LastName = request.LastName;

        await _userRepository.AddAsync(newUser);

        return Ok(new { message = "Registration successful" });
    }

    // --- Account lockout configuration ---
    // After MaxFailedLoginAttempts consecutive bad attempts for the same identifier
    // within the failure-tracking window, the account is locked out for LockoutDuration.
    // Tracked in-memory (IMemoryCache, already injected for OTP handling) so no schema
    // migration is required; counters are keyed by the normalized login identifier.
    private static readonly TimeSpan FailureTrackingWindow = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(15);
    private const int MaxFailedLoginAttempts = 5;

    private static string LockoutCacheKey(string identifier) => $"LOGIN_LOCKOUT_{identifier}";
    private static string FailureCountCacheKey(string identifier) => $"LOGIN_FAILCOUNT_{identifier}";

    private void RegisterFailedLoginAttempt(string identifier)
    {
        var failKey = FailureCountCacheKey(identifier);
        var attempts = _cache.TryGetValue(failKey, out int existing) ? existing + 1 : 1;
        _cache.Set(failKey, attempts, FailureTrackingWindow);

        if (attempts >= MaxFailedLoginAttempts)
        {
            _cache.Set(LockoutCacheKey(identifier), DateTime.UtcNow.Add(LockoutDuration), LockoutDuration);
            _cache.Remove(failKey);
        }
    }

    private void ClearFailedLoginAttempts(string identifier)
    {
        _cache.Remove(FailureCountCacheKey(identifier));
        _cache.Remove(LockoutCacheKey(identifier));
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login(LoginRequestDto request)
    {
        var identifier = request.Email.Trim().ToLower();

        // Reject immediately if this identifier is currently locked out — do this
        // before touching the database so a determined attacker can't use timing
        // differences to learn whether the account exists.
        if (_cache.TryGetValue(LockoutCacheKey(identifier), out DateTime lockedUntil))
        {
            if (DateTime.UtcNow < lockedUntil)
            {
                var minutesLeft = Math.Max(1, (int)Math.Ceiling((lockedUntil - DateTime.UtcNow).TotalMinutes));
                return StatusCode(StatusCodes.Status423Locked, new
                {
                    message = $"Too many failed login attempts. This account is temporarily locked. Please try again in about {minutesLeft} minute(s)."
                });
            }
            // Lockout window has elapsed — clear it and allow the attempt to proceed.
            _cache.Remove(LockoutCacheKey(identifier));
        }

        var user = await _userRepository.GetByEmailOrPhoneAsync(
            identifier,
            q => q.Include(u => u.Role)
                  .Include(u => u.School)
                  .Include(u => u.TeacherProfile)
                  .Include(u => u.StudentProfile).ThenInclude(s => s.Grade));

        if (user == null)
        {
            RegisterFailedLoginAttempt(identifier);
            return Unauthorized(new { message = "Invalid credentials" });
        }

        // Enforce login credential type per role
        if (user.Role?.RoleName == "Student" && !string.Equals(user.Email, identifier, StringComparison.OrdinalIgnoreCase))
        {
            RegisterFailedLoginAttempt(identifier);
            return Unauthorized(new { message = "Invalid credentials" });
        }

        if (user.Role?.RoleName == "Parent" && !string.Equals(user.Phone, identifier, StringComparison.OrdinalIgnoreCase))
        {
            RegisterFailedLoginAttempt(identifier);
            return Unauthorized(new { message = "Invalid credentials" });
        }

        bool isPasswordValid = SafeVerify(request.Password.Trim(), user.PasswordHash);

        if (!isPasswordValid)
        {
            RegisterFailedLoginAttempt(identifier);
            return Unauthorized(new { message = "Invalid credentials" });
        }

        // Successful login — clear any tracked failures/lockout for this identifier.
        ClearFailedLoginAttempts(identifier);

        var token = _jwtService.GenerateToken(user);

        return Ok(new 
        { 
            token,
            user = new 
            {
                id = user.Id,
                email = user.Email,
                first_name = user.FirstName,
                last_name = user.LastName,
                full_name = $"{user.FirstName} {user.LastName}",
                role = user.Role?.RoleName ?? "unknown",
                utype = (user.Role?.RoleName) switch
                {
                    "SuperAdmin" => "admin",
                    "Principal" => "principal",
                    _ => user.Role?.RoleName?.ToLower() ?? "student"
                },
                school_id = user.SchoolId,
                school_name = user.School?.Name,
                teacher_id = user.TeacherProfile?.Id,
                student_id = user.StudentProfile?.Id,
                grade_id = user.StudentProfile?.GradeId,
                phone = user.Phone,
                is_active = user.IsActive
            }
        });
    }
    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequestDto request)
    {
        var user = await _userRepository.GetByEmailAsync(request.Email.Trim().ToLower());
        if (user == null)
        {
            // Do not reveal that the user does not exist to prevent enumeration attacks.
            // NOTE: the success branch below now returns this exact same message string —
            // previously it returned a different "OTP sent successfully" message, which
            // itself was a subtle enumeration side-channel (an attacker could distinguish
            // "exists" vs. "doesn't exist" purely from the response text). Keeping both
            // branches' wording identical closes that gap.
            return Ok(new { message = "If this account exists, an OTP will be sent." });
        }

        var otp = new Random().Next(100000, 999999).ToString();
        _cache.Set($"OTP_{request.Email.Trim().ToLower()}", otp, TimeSpan.FromMinutes(15));

        // Deliver the OTP via the real out-of-band email channel (closes QA-documented
        // gap "Email/SMS delivery channel for critical notifications" — this was
        // previously a console-only "[MAIL SIMULATION]" with no actual delivery path).
        // SmtpEmailService transparently falls back to the same console-simulation
        // behavior when no SMTP host is configured, so this is safe in every environment.
        // Email delivery is intentionally best-effort: a delivery hiccup must never
        // block the OTP from being issued (the user can still see it via the console
        // fallback in dev, and a real send failure is logged server-side for ops).
        await _emailService.SendAsync(
            user.Email,
            "Your NubeEra LMS password reset code",
            $"Hello {user.FirstName ?? "there"},\n\nYour one-time password reset code is: {otp}\n\nThis code expires in 15 minutes. If you didn't request a password reset, you can safely ignore this email.\n\n— NubeEra LMS",
            isHtml: false);

        return Ok(new { message = "If this account exists, an OTP will be sent." });
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequestDto request)
    {
        var cacheKey = $"OTP_{request.Email.Trim().ToLower()}";
        if (!_cache.TryGetValue(cacheKey, out string? savedOtp) || savedOtp != request.Otp)
        {
            return BadRequest(new { message = "Invalid or expired OTP" });
        }

        var user = await _userRepository.GetByEmailAsync(request.Email.Trim().ToLower());
        if (user == null) return BadRequest(new { message = "User not found" });

        var newHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.UpdatePassword(newHash);
        await _userRepository.UpdateAsync(user);

        _cache.Remove(cacheKey);

        return Ok(new { message = "Password reset successfully" });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                        ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
                        
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();

        var user = await _userRepository.GetByIdAsync(
            Guid.Parse(userIdStr),
            q => q.Include(u => u.Role)
                  .Include(u => u.School)
                  .Include(u => u.TeacherProfile)
                  .Include(u => u.StudentProfile).ThenInclude(s => s.Grade));

        if (user == null) return NotFound();

        return Ok(new 
        {
            id = user.Id,
            email = user.Email,
            first_name = user.FirstName,
            last_name = user.LastName,
            full_name = $"{user.FirstName} {user.LastName}",
            role = user.Role.RoleName,
            utype = user.Role.RoleName switch
            {
                "SuperAdmin" => "admin",
                "Principal" => "principal",
                _ => user.Role.RoleName.ToLower()
            },
            school_id = user.SchoolId,
            school_name = user.School?.Name,
            teacher_id = user.TeacherProfile?.Id,
            student_id = user.StudentProfile?.Id,
            grade_id = user.StudentProfile?.GradeId,
            phone = user.Phone,
            is_active = user.IsActive
        });
    }

    private static bool SafeVerify(string password, string hash)
    {
        if (string.IsNullOrEmpty(hash)) return false;
        try
        {
            var result = BCrypt.Net.BCrypt.Verify(password, hash);
            if (!result)
            {
                Console.WriteLine($"[SafeVerify AuthController Fail] pwdLength: {password?.Length}, hashLength: {hash?.Length}, hashStart: {hash?[..Math.Min(10, hash.Length)]}");
            }
            return result;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[SafeVerify AuthController Exception] pwdLength: {password?.Length}, hashLength: {hash?.Length}. Error: {ex}");
            return false;
        }
    }
}

// Request DTOs now live in NubeEra.Application/DTOs/Auth/AuthRequestDtos.cs
// (LoginRequestDto, RegisterRequestDto, ChangePasswordRequestDto,
//  ForgotPasswordRequestDto, ResetPasswordRequestDto)

