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
    private readonly IGenericRepository<Student> _studentRepository;
    private readonly NubeEra.Application.Interfaces.Services.Email.IEmailService _emailService;
    private readonly IConfiguration _configuration;

    public AuthController(
        IUserRepository userRepository,
        IJwtTokenService jwtService,
        IMemoryCache cache,
        IGenericRepository<Role> roleRepository,
        IGenericRepository<Student> studentRepository,
        NubeEra.Application.Interfaces.Services.Email.IEmailService emailService,
        IConfiguration configuration)
    {
        _userRepository = userRepository;
        _jwtService = jwtService;
        _cache = cache;
        _roleRepository = roleRepository;
        _studentRepository = studentRepository;
        _emailService = emailService;
        _configuration = configuration;
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

        // Enforce login credential match per role
        if (user.Role?.RoleName == "Student")
        {
            bool matches = string.Equals(user.Email, identifier, StringComparison.OrdinalIgnoreCase) ||
                           (!string.IsNullOrEmpty(user.Username) && string.Equals(user.Username, identifier, StringComparison.OrdinalIgnoreCase));
            if (!matches)
            {
                RegisterFailedLoginAttempt(identifier);
                return Unauthorized(new { message = "Invalid credentials" });
            }
        }
        else if (user.Role?.RoleName == "Parent")
        {
            var clean = identifier.Trim();
            var lower = clean.ToLower();
            var digitsOnly = new string(clean.Where(char.IsDigit).ToArray());
            var userPhone = user.Phone?.Trim() ?? "";
            var userEmail = user.Email?.Trim().ToLower() ?? "";
            var userUsername = user.Username?.Trim().ToLower() ?? "";

            bool matches = string.Equals(userPhone, clean, StringComparison.OrdinalIgnoreCase) ||
                           (!string.IsNullOrEmpty(digitsOnly) && string.Equals(userPhone, digitsOnly, StringComparison.OrdinalIgnoreCase)) ||
                           string.Equals(userEmail, lower, StringComparison.OrdinalIgnoreCase) ||
                           (!string.IsNullOrEmpty(userUsername) && string.Equals(userUsername, lower, StringComparison.OrdinalIgnoreCase)) ||
                           string.Equals(userEmail, $"{lower}@veriton.parent", StringComparison.OrdinalIgnoreCase) ||
                           string.Equals(userEmail, $"parent_{lower}@veriton.parent", StringComparison.OrdinalIgnoreCase) ||
                           (lower.EndsWith("@veriton.parent") && string.Equals(userPhone, lower.Replace("@veriton.parent", "").Replace("parent_", ""), StringComparison.OrdinalIgnoreCase));

            if (!matches)
            {
                RegisterFailedLoginAttempt(identifier);
                return Unauthorized(new { message = "Invalid credentials" });
            }
        }
        else
        {
            // For all other roles (SuperAdmin, Admin, Principal, Teacher, Staff), enforce email or username match
            bool matches = string.Equals(user.Email, identifier, StringComparison.OrdinalIgnoreCase) ||
                           (!string.IsNullOrEmpty(user.Username) && string.Equals(user.Username, identifier, StringComparison.OrdinalIgnoreCase));
            if (!matches)
            {
                RegisterFailedLoginAttempt(identifier);
                return Unauthorized(new { message = "Invalid credentials" });
            }
        }

        bool isPasswordValid = SafeVerify(request.Password.Trim(), user.PasswordHash);

        if (!isPasswordValid)
        {
            RegisterFailedLoginAttempt(identifier);
            return Unauthorized(new { message = "Invalid credentials" });
        }

        if (!user.IsActive || user.IsDeleted)
        {
            return Unauthorized(new { message = "Account is inactive. Please contact system administrator." });
        }

        if (user.Role?.RoleName == "Parent")
        {
            // Parent login verification: verify parent account is active
            if (!user.IsActive || user.IsDeleted)
            {
                return Unauthorized(new { message = "Parent account is inactive. Please contact system administrator." });
            }
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
                username = user.Username,
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
        var identifier = request.Email?.Trim() ?? "";
        if (string.IsNullOrWhiteSpace(identifier))
        {
            return BadRequest(new { message = "Email address or phone number is required." });
        }

        var user = await _userRepository.GetByEmailOrPhoneAsync(identifier);
        if (user == null)
        {
            return Ok(new { message = "If this account exists, an OTP code has been generated." });
        }

        var otp = new Random().Next(100000, 999999).ToString();
        var lowerIdentifier = identifier.ToLower();
        _cache.Set($"OTP_{lowerIdentifier}", otp, TimeSpan.FromMinutes(15));

        if (!string.IsNullOrEmpty(user.Email) && !user.Email.Equals(lowerIdentifier, StringComparison.OrdinalIgnoreCase))
        {
            _cache.Set($"OTP_{user.Email.ToLower()}", otp, TimeSpan.FromMinutes(15));
        }
        if (!string.IsNullOrEmpty(user.Phone) && !user.Phone.Equals(lowerIdentifier, StringComparison.OrdinalIgnoreCase))
        {
            _cache.Set($"OTP_{user.Phone.ToLower()}", otp, TimeSpan.FromMinutes(15));
        }

        bool emailSent = false;
        if (!string.IsNullOrWhiteSpace(user.Email) && user.Email.Contains('@') && !user.Email.EndsWith(".local"))
        {
            emailSent = await _emailService.SendAsync(
                user.Email,
                "Your NubeEra LMS password reset code",
                $"Hello {user.FirstName ?? "there"},\n\nYour one-time password reset code is: {otp}\n\nThis code expires in 15 minutes. If you didn't request a password reset, you can safely ignore this email.\n\n— NubeEra LMS",
                isHtml: false);
        }

        var isSmtpConfigured = !string.IsNullOrWhiteSpace(_configuration["Smtp:Host"]);

        if (!isSmtpConfigured || !emailSent)
        {
            // When SMTP is not configured or in local dev/simulation, return the OTP so the user can test & reset password
            return Ok(new 
            { 
                message = $"OTP generated. (Dev Mode Passcode: {otp})", 
                otp = otp 
            });
        }

        return Ok(new { message = "OTP has been sent to your registered email address." });
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequestDto request)
    {
        var identifier = request.Email?.Trim() ?? "";
        if (string.IsNullOrWhiteSpace(identifier))
        {
            return BadRequest(new { message = "Email address or phone number is required." });
        }

        var user = await _userRepository.GetByEmailOrPhoneAsync(identifier);
        if (user == null) return BadRequest(new { message = "User account not found." });

        var lowerIdentifier = identifier.ToLower();
        var cacheKey = $"OTP_{lowerIdentifier}";
        var userEmailCacheKey = $"OTP_{user.Email.ToLower()}";
        var userPhoneCacheKey = !string.IsNullOrEmpty(user.Phone) ? $"OTP_{user.Phone.ToLower()}" : "";

        bool otpMatches = false;
        if (_cache.TryGetValue(cacheKey, out string? savedOtp) && savedOtp == request.Otp)
        {
            otpMatches = true;
        }
        else if (_cache.TryGetValue(userEmailCacheKey, out string? emailOtp) && emailOtp == request.Otp)
        {
            otpMatches = true;
        }
        else if (!string.IsNullOrEmpty(userPhoneCacheKey) && _cache.TryGetValue(userPhoneCacheKey, out string? phoneOtp) && phoneOtp == request.Otp)
        {
            otpMatches = true;
        }

        if (!otpMatches)
        {
            return BadRequest(new { message = "Invalid or expired OTP code." });
        }

        var newHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.UpdatePassword(newHash);
        await _userRepository.UpdateAsync(user);

        _cache.Remove(cacheKey);
        _cache.Remove(userEmailCacheKey);
        if (!string.IsNullOrEmpty(userPhoneCacheKey)) _cache.Remove(userPhoneCacheKey);

        return Ok(new { message = "Password reset successfully! You can now log in with your new password." });
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
            username = user.Username,
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

