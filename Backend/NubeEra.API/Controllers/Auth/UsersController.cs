using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using NubeEra.Application.Interfaces.Repositories;
using NubeEra.Application.Interfaces.Services;
using NubeEra.Domain.Common;
using NubeEra.Domain.Constants;
using NubeEra.Domain.Entities;
using NubeEra.Application.Interfaces.Security;

namespace NubeEra.API.Controllers.Auth;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserRepository _userRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly ITenantService      _tenantService;
    private readonly IGenericRepository<Student> _studentRepository;
    private readonly IGenericRepository<Teacher> _teacherRepository;
    private readonly IGenericRepository<Role> _roleRepository;
    private readonly IStudentService _studentService;
    private readonly ITeacherService _teacherService;
    private readonly IGenericRepository<NubeEra.Domain.Entities.School> _schoolRepository;
    private readonly Microsoft.Extensions.Logging.ILogger<UsersController> _logger;

    public UsersController(
        IUserRepository userRepository, 
        ICurrentUserService currentUserService,
        IGenericRepository<Student> studentRepository,
        IGenericRepository<Teacher> teacherRepository,
        IGenericRepository<Role> roleRepository, 
        IGenericRepository<NubeEra.Domain.Entities.School> schoolRepository,
        ITenantService tenantService,
        IStudentService studentService,
        ITeacherService teacherService,
        Microsoft.Extensions.Logging.ILogger<UsersController> logger)
    {
        _userRepository = userRepository;
        _currentUserService = currentUserService;
        _tenantService      = tenantService;
        _studentRepository = studentRepository;
        _teacherRepository = teacherRepository;
        _roleRepository = roleRepository;
        _schoolRepository = schoolRepository;
        _studentService = studentService;
        _teacherService = teacherService;
        _logger = logger;
    }

    /// <summary>
    /// Common duplicate-check used by Students/Teachers/Users create &amp; edit forms so the
    /// UI can flag a taken email or mobile number on field blur, before the form is submitted.
    /// Checks across the User, Student and Teacher tables (their own Email/Phone columns only —
    /// it deliberately does NOT look at Student.ParentGuardianPhone, since a parent legitimately
    /// shares one phone number across multiple children's records).
    /// </summary>
    [HttpGet("check-duplicate")]
    public async Task<IActionResult> CheckDuplicate([FromQuery] string field, [FromQuery] string value)
    {
        if (string.IsNullOrWhiteSpace(field) || string.IsNullOrWhiteSpace(value))
            return Ok(new { exists = false });

        var normalizedField = field.Trim().ToLowerInvariant();
        var normalizedValue = value.Trim();

        bool exists;
        if (normalizedField == "email")
        {
            var lower = normalizedValue.ToLowerInvariant();
            var userMatches = await _userRepository.Query().IgnoreQueryFilters().AnyAsync(u => u.Email.ToLower() == lower && !u.IsDeleted);
            var studentMatches = await _studentRepository.Query().IgnoreQueryFilters().AnyAsync(s => s.Email != null && s.Email.ToLower() == lower && !s.IsDeleted);
            var teacherMatches = await _teacherRepository.Query().IgnoreQueryFilters().AnyAsync(t => t.Email != null && t.Email.ToLower() == lower && !t.IsDeleted);
            exists = userMatches || studentMatches || teacherMatches;
        }
        else if (normalizedField == "phone")
        {
            var userMatches = await _userRepository.Query().IgnoreQueryFilters().AnyAsync(u => u.Phone == normalizedValue && !u.IsDeleted);
            var studentMatches = await _studentRepository.Query().IgnoreQueryFilters().AnyAsync(s => s.Phone == normalizedValue && !s.IsDeleted);
            var teacherMatches = await _teacherRepository.Query().IgnoreQueryFilters().AnyAsync(t => t.Phone == normalizedValue && !t.IsDeleted);
            exists = userMatches || studentMatches || teacherMatches;
        }
        else if (normalizedField == "username")
        {
            var lower = normalizedValue.ToLowerInvariant();
            exists = await _userRepository.Query()
                .IgnoreQueryFilters()
                .AnyAsync(u => u.Username != null && u.Username.ToLower() == lower && !u.IsDeleted);
        }
        else
        {
            return BadRequest(new { message = "field must be 'email', 'phone' or 'username'" });
        }

        return Ok(new { exists });
    }

    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                        ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
                        
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();

        var user = await _userRepository.GetByIdAsync(Guid.Parse(userIdStr), 
            u => u.Include(x => x.Role).Include(x => x.School));
            
        if (user == null) return NotFound();
        
        var student = await _studentRepository.GetAllAsync(q => q.Where(s => s.UserId == user.Id));
        var teacher = await _teacherRepository.GetAllAsync(q => q.Where(t => t.UserId == user.Id));

        return Ok(new
        {
            id = user.Id,
            email = user.Email,
            username = user.Username,
            first_name = user.FirstName,
            last_name = user.LastName,
            full_name = $"{user.FirstName} {user.LastName}",
            role = user.Role?.RoleName ?? "User",
            utype = (user.Role?.RoleName ?? "") switch
            {
                "SuperAdmin" => "admin",
                "Principal" => "principal",
                _ => (user.Role?.RoleName ?? "user").ToLower()
            },
            school_id = user.SchoolId,
            school_name = user.School?.Name,
            phone = user.Phone,
            profile_image_url = user.ProfileImageUrl,
            is_active = user.IsActive,
            
            // Student specific fields
            student_details = student.FirstOrDefault() != null ? new {
                blood_group = student.First().BloodGroup,
                gender = student.First().Gender,
                date_of_birth = student.First().DateOfBirth,
                address = student.First().Address,
                parent_guardian_name = student.First().ParentGuardianName,
                parent_guardian_phone = student.First().ParentGuardianPhone,
                parent_guardian_email = student.First().ParentGuardianEmail,
                emergency_contact = student.First().EmergencyContact,
                student_id = student.First().StudentId,
                roll_no = student.First().RollNo
            } : null,

            // Teacher specific fields
            teacher_details = teacher.FirstOrDefault() != null ? new {
                gender = teacher.First().Gender,
                date_of_birth = teacher.First().DateOfBirth,
                address = teacher.First().Address,
                qualification = teacher.First().Qualification,
                specialization = teacher.First().Specialization,
                employee_id = teacher.First().EmployeeId
            } : null
        });
    }

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile(UpdateProfileRequest request)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                        ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
                        
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();

        var user = await _userRepository.GetByIdAsync(Guid.Parse(userIdStr));
        if (user == null) return NotFound();

        // Email update & uniqueness check
        if (!string.IsNullOrWhiteSpace(request.Email) && !string.Equals(user.Email, request.Email.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            var cleanEmail = request.Email.Trim();
            var existingUser = await _userRepository.GetByEmailAsync(cleanEmail);
            if (existingUser != null && existingUser.Id != user.Id)
            {
                return BadRequest(new { message = "Email is already in use by another account." });
            }
            user.UpdateEmail(cleanEmail);
        }

        // Username update & uniqueness check
        if (request.Username != null)
        {
            var cleanUsername = string.IsNullOrWhiteSpace(request.Username) ? null : request.Username.Trim().ToLowerInvariant();
            if (cleanUsername != null && !string.Equals(user.Username, cleanUsername, StringComparison.OrdinalIgnoreCase))
            {
                var existingUser = await _userRepository.Query()
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(u => u.Id != user.Id && u.Username != null && u.Username.ToLower() == cleanUsername && !u.IsDeleted);
                if (existingUser != null)
                {
                    return BadRequest(new { message = "Username is already in use by another account." });
                }
            }
            user.UpdateUsername(cleanUsername);
        }

        user.FirstName = request.FirstName;
        user.LastName = request.LastName;
        user.Phone = request.Phone;
        user.ProfileImageUrl = request.ProfileImageUrl;

        await _userRepository.UpdateAsync(user);

        // Update linked Student if it exists
        var students = await _studentRepository.GetAllAsync(q => q.Where(s => s.UserId == user.Id));
        var student = students.FirstOrDefault();
        if (student != null)
        {
            student.FirstName = request.FirstName ?? student.FirstName;
            student.LastName = request.LastName ?? student.LastName;
            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                student.Email = request.Email.Trim();
            }
            student.Phone = request.Phone;
            student.ProfilePictureUrl = request.ProfileImageUrl ?? student.ProfilePictureUrl;
            student.DateOfBirth = request.DateOfBirth;
            student.Gender = request.Gender;
            student.BloodGroup = request.BloodGroup;
            student.Address = request.Address;
            student.ParentGuardianName = request.ParentGuardianName;
            student.ParentGuardianPhone = request.ParentGuardianPhone;
            student.ParentGuardianEmail = request.ParentGuardianEmail;
            student.EmergencyContact = request.EmergencyContact;
            await _studentRepository.UpdateAsync(student);
        }

        // Update linked Teacher if it exists
        var teachers = await _teacherRepository.GetAllAsync(q => q.Where(t => t.UserId == user.Id));
        var teacher = teachers.FirstOrDefault();
        if (teacher != null)
        {
            teacher.FirstName = request.FirstName ?? teacher.FirstName;
            teacher.LastName = request.LastName ?? teacher.LastName;
            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                teacher.Email = request.Email.Trim();
            }
            teacher.Phone = request.Phone;
            teacher.ProfilePictureUrl = request.ProfileImageUrl ?? teacher.ProfilePictureUrl;
            teacher.DateOfBirth = request.DateOfBirth;
            teacher.Gender = request.Gender;
            teacher.Address = request.Address;
            teacher.Qualification = request.Qualification;
            teacher.Specialization = request.Specialization;
            await _teacherRepository.UpdateAsync(teacher);
        }

        return NoContent();
    }


    [HttpGet]
    [Authorize(Policy = "StaffOnly")]
    public async Task<IActionResult> GetAll([FromQuery] string? role, [FromQuery] Guid? schoolId)
    {
        try
        {
            var users = await _userRepository.GetAllAsync(q => q.Include(u => u.Role).Include(u => u.School));
            
            IEnumerable<User> filtered = users;
            
            // Tenant scoping: restricted roles always see their school; non-restricted
            // use the school selected via the UI (X-School-Id header → JWT fallback).
            var effSchool = _tenantService.GetEffectiveSchoolId(schoolId);
            if (effSchool.HasValue)
                filtered = filtered.Where(u => u.SchoolId == effSchool);
            
            if (!string.IsNullOrEmpty(role))
                filtered = filtered.Where(u => string.Equals(u.Role?.RoleName, role, StringComparison.OrdinalIgnoreCase));
                
            var response = filtered.Select(u =>
            {
                var roleName = u.Role?.RoleName ?? "User";
                var utype = roleName switch
                {
                    "SuperAdmin" => "admin",
                    "Principal" => "principal",
                    _ => roleName.ToLower()
                };

                return new
                {
                    id = u.Id,
                    email = u.Email,
                    username = u.Username,
                    first_name = u.FirstName,
                    last_name = u.LastName,
                    full_name = $"{u.FirstName} {u.LastName}".Trim(),
                    role = roleName,
                    utype = utype,
                    school_id = u.SchoolId,
                    school_name = u.School?.Name,
                    is_active = u.IsActive,
                    phone = u.Phone,
                    created_at = u.CreatedAt
                };
            });

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while fetching user directory");
            return StatusCode(500, new { message = "Failed to load user directory", error = ex.Message });
        }
    }

    [HttpPost]
    [Authorize(Policy = "StaffOnly")]
    public async Task<IActionResult> Create(UserCreateRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            // Student and Parent roles allow simple passwords (minimum 6 characters, e.g. '123456').
            // Other staff/teacher/admin roles enforce standard policy (8+ chars, uppercase, digit).
            var isStudentOrParentRole = string.Equals(request.Role, "Student", StringComparison.OrdinalIgnoreCase) ||
                                        string.Equals(request.Role, "Parent", StringComparison.OrdinalIgnoreCase);

            if (isStudentOrParentRole)
            {
                if (string.IsNullOrEmpty(request.Password) || request.Password.Length < 6)
                    return BadRequest(new { message = "Password must be at least 6 characters." });
            }
            else
            {
                if (string.IsNullOrEmpty(request.Password) || request.Password.Length < 8)
                    return BadRequest(new { message = "Password must be at least 8 characters." });
                if (!System.Text.RegularExpressions.Regex.IsMatch(request.Password, "[A-Z]"))
                    return BadRequest(new { message = "Password must contain at least one uppercase letter." });
                if (!System.Text.RegularExpressions.Regex.IsMatch(request.Password, "[0-9]"))
                    return BadRequest(new { message = "Password must contain at least one digit." });
            }

            var effectiveSchoolId = _tenantService.GetEffectiveSchoolId(request.SchoolId);
            var schoolId = (effectiveSchoolId == Guid.Empty) ? null : effectiveSchoolId;

            var existingUser = await _userRepository.GetByEmailAsync(request.Email.Trim().ToLower(), null);
            if (existingUser != null)
                return BadRequest(new { message = "User with this email already exists" });

            var username = request.Username?.Trim();
            if (!string.IsNullOrWhiteSpace(username))
            {
                var existingByUsername = await _userRepository.Query()
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(u => u.Username != null && u.Username.ToLower() == username.ToLower() && !u.IsDeleted);
                if (existingByUsername != null)
                    return BadRequest(new { message = "User with this username already exists" });

                var deletedUser = await _userRepository.Query()
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(u => u.Username != null && u.Username.ToLower() == username.ToLower() && u.IsDeleted);
                if (deletedUser != null)
                {
                    deletedUser.Username = MakeUniqueAfterDelete(deletedUser.Username!, deletedUser.Id, 100);
                    await _userRepository.UpdateAsync(deletedUser);
                }
            }

            var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

            var roleObj = (await _roleRepository.GetAllAsync(q => q.Where(r => r.RoleName == request.Role))).FirstOrDefault();
            if (roleObj == null)
                return BadRequest(new { message = $"Role '{request.Role}' not found in database." });

            if (roleObj.RoleName.Equals("Student", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "Student accounts must be created from the Students panel so grade, division and login details stay in sync." });

            if (roleObj.RoleName.Equals("Admin", StringComparison.OrdinalIgnoreCase))
            {
                var existingAdmins = await _userRepository.GetAllAsync(q => q.Include(u => u.Role).Where(u => u.Role != null && u.Role.RoleName == "Admin"));
                if (existingAdmins.Any())
                    return BadRequest(new { message = "An Admin account already exists. Only one Admin account is permitted on this platform." });
            }

            var user = new User(request.Email.Trim().ToLower(), passwordHash, roleObj.Id, schoolId, username);
            user.FirstName = request.FirstName;
            user.LastName = request.LastName;

            await _userRepository.AddAsync(user);

            // If the role is Teacher, also create a Teacher profile automatically
            if (request.Role.Equals("Teacher", StringComparison.OrdinalIgnoreCase))
            {
                var teacherSchoolId = schoolId;
                if (!teacherSchoolId.HasValue || teacherSchoolId.Value == Guid.Empty)
                {
                    var firstSchool = await _schoolRepository.Query().Where(s => !s.IsDeleted).Select(s => s.Id).FirstOrDefaultAsync();
                    if (firstSchool != Guid.Empty)
                    {
                        teacherSchoolId = firstSchool;
                    }
                }

                if (teacherSchoolId.HasValue && teacherSchoolId.Value != Guid.Empty)
                {
                    var teacher = new Teacher
                    {
                        UserId = user.Id,
                        SchoolId = teacherSchoolId.Value,
                        FirstName = request.FirstName ?? "",
                        LastName = request.LastName ?? "",
                        Email = request.Email.Trim().ToLower(),
                        EmployeeId = "T-" + DateTime.UtcNow.Ticks.ToString().Substring(10),
                        JoiningDate = DateTime.UtcNow,
                        IsActive = true
                    };
                    await _teacherRepository.AddAsync(teacher);
                }
            }

            return Ok(new { id = user.Id, message = "User created successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create user");
            return StatusCode(500, new { message = "Failed to create user: " + ex.Message });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "StaffOnly")]
    public async Task<IActionResult> Update(Guid id, UserUpdateRequest request)
    {
        try
        {
            var user = await _userRepository.GetByIdAsync(id, q => q.Include(u => u.Role));
            if (user == null) return NotFound();

            var username = request.Username?.Trim();
            if (!string.IsNullOrWhiteSpace(username) && !string.Equals(user.Username, username, StringComparison.OrdinalIgnoreCase))
            {
                var existingByUsername = await _userRepository.Query()
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(u => u.Id != user.Id && u.Username != null && u.Username.ToLower() == username.ToLower() && !u.IsDeleted);
                if (existingByUsername != null)
                    return BadRequest(new { message = "User with this username already exists" });
            }

            user.Username = username;
            user.FirstName = request.FirstName;
            user.LastName = request.LastName;

            var roleObj = (await _roleRepository.GetAllAsync(q => q.Where(r => r.RoleName == request.Role))).FirstOrDefault();
            if (roleObj == null)
                return BadRequest(new { message = $"Role '{request.Role}' not found in database." });

            if (roleObj.RoleName.Equals("Admin", StringComparison.OrdinalIgnoreCase) && user.RoleId != roleObj.Id)
            {
                var existingAdmins = await _userRepository.GetAllAsync(q => q.Include(u => u.Role).Where(u => u.Role != null && u.Role.RoleName == "Admin" && u.Id != user.Id));
                if (existingAdmins.Any())
                    return BadRequest(new { message = "An Admin account already exists. Only one Admin account is permitted on this platform." });
            }

            user.SetRole(roleObj.Id);
            
            if (_tenantService.CanSelectSchool())
            {
                user.SchoolId = (request.SchoolId == Guid.Empty) ? null : request.SchoolId;
            }
            
            var callerRole = _currentUserService.Role ?? "";
            bool isAdmin = callerRole.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase) || callerRole.Equals("Admin", StringComparison.OrdinalIgnoreCase);

            // Only Admin accounts can change active/inactive status
            if (isAdmin)
            {
                if (request.IsActive) user.Activate();
                else user.Deactivate();
            }

            await _userRepository.UpdateAsync(user);

            // Sync IsActive and SchoolId to linked Teacher/Student profiles
            var teachersToSync = await _teacherRepository.GetAllAsync(q => q.Where(t => t.UserId == user.Id));
            foreach (var t in teachersToSync)
            {
                if (user.SchoolId.HasValue && user.SchoolId.Value != Guid.Empty) t.SchoolId = user.SchoolId.Value;
                if (isAdmin) t.IsActive = user.IsActive;
                await _teacherRepository.UpdateAsync(t);
            }

            var studentsToSync = await _studentRepository.GetAllAsync(q => q.Where(s => s.UserId == user.Id));
            foreach (var s in studentsToSync)
            {
                if (user.SchoolId.HasValue && user.SchoolId.Value != Guid.Empty) s.SchoolId = user.SchoolId.Value;
                if (isAdmin) s.IsActive = user.IsActive;
                await _studentRepository.UpdateAsync(s);
            }

            if (user.SchoolId.HasValue && user.SchoolId.Value != Guid.Empty)
            {
                // If the role was just changed to Teacher and this user has no linked
                // Teacher profile yet, create one now
                if (roleObj.RoleName.Equals("Teacher", StringComparison.OrdinalIgnoreCase) && !teachersToSync.Any())
                {
                    var newTeacher = new Teacher
                    {
                        UserId = user.Id,
                        SchoolId = user.SchoolId.Value,
                        FirstName = user.FirstName ?? "",
                        LastName = user.LastName ?? "",
                        Email = user.Email,
                        EmployeeId = "T-" + DateTime.UtcNow.Ticks.ToString().Substring(10),
                        JoiningDate = DateTime.UtcNow,
                        IsActive = user.IsActive
                    };
                    await _teacherRepository.AddAsync(newTeacher);
                }
            }
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update user {UserId}", id);
            return StatusCode(500, new { message = "Failed to update user: " + ex.Message });
        }
    }

    /// <summary>
    /// Toggle user active/hold status (Admin only)
    /// </summary>
    [HttpPut("{id}/toggle-status")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> ToggleStatus(Guid id)
    {
        var user = await _userRepository.GetByIdAsync(id);
        if (user == null) return NotFound();

        if (user.IsActive) user.Deactivate();
        else user.Activate();

        await _userRepository.UpdateAsync(user);

        // Sync status to linked Teacher/Student profiles
        var teachers = await _teacherRepository.GetAllAsync(q => q.Where(t => t.UserId == user.Id));
        foreach (var t in teachers)
        {
            t.IsActive = user.IsActive;
            await _teacherRepository.UpdateAsync(t);
        }

        var students = await _studentRepository.GetAllAsync(q => q.Where(s => s.UserId == user.Id));
        foreach (var s in students)
        {
            s.IsActive = user.IsActive;
            await _studentRepository.UpdateAsync(s);
        }

        return Ok(new { is_active = user.IsActive, message = user.IsActive ? "User activated" : "User put on hold" });
    }

    /// <summary>
    /// Reset a user's password. If a password is provided in the body, use it;
    /// otherwise reset to a default based on role.
    /// </summary>
    [HttpPut("{id}/reset-password")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> ResetPassword(Guid id, [FromBody] ResetPasswordBody? request)
    {
        var user = await _userRepository.GetByIdAsync(id, q => q.Include(u => u.Role));
        if (user == null) return NotFound();

        var requesterRole = _currentUserService.Role ?? "";
        var targetRole = user.Role?.RoleName ?? "User";

        Func<string, int> getRoleWeight = (roleName) => roleName.ToLower() switch
        {
            "student" => 1,
            "parent" => 2,
            "teacher" => 3,
            "principal" => 4,
            "staff" => 5,
            "admin" => 6,
            "superadmin" => 7,
            _ => 0
        };

        // Strict role hierarchy check: requesters cannot reset the password of anyone with equal or higher role privilege
        // (except SuperAdmin/Admin who are cross-school administrators)
        if (getRoleWeight(requesterRole) <= getRoleWeight(targetRole) && 
            !new[] { "superadmin", "admin" }.Contains(requesterRole.ToLower()))
        {
            return Forbid();
        }

        // Boundary check: Non-administrators (Principal, Teacher) can only reset passwords for users in their own school
        if (!new[] { "superadmin", "admin", "staff" }.Contains(requesterRole.ToLower()))
        {
            var requesterSchoolId = _currentUserService.SchoolId;
            if (requesterSchoolId.HasValue && user.SchoolId.HasValue && requesterSchoolId.Value != user.SchoolId.Value)
            {
                return Forbid();
            }
        }

        string passwordToSet;
        
        if (request != null && !string.IsNullOrWhiteSpace(request.Password))
        {
            passwordToSet = request.Password;
        }
        else
        {
            passwordToSet = (user.Role?.RoleName ?? "") switch
            {
                "Student" => "123456",
                "Parent" => "123456",
                "Teacher" => "Teacher@123",
                "Principal" => "Principal@123",
                "Staff" => "Staff@123",
                _ => "Default@123"
            };
        }

        var newHash = BCrypt.Net.BCrypt.HashPassword(passwordToSet);
        user.UpdatePassword(newHash);

        await _userRepository.UpdateAsync(user);
        
        var message = (request != null && !string.IsNullOrWhiteSpace(request.Password))
            ? $"Password updated successfully for {user.Email}"
            : $"Password reset to default for {user.Email}";
            
        return Ok(new { message });
    }

    /// <summary>
    /// "Deletes" a user. Implemented as a soft delete (deactivation) rather than a
    /// hard delete.
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            var user = await _userRepository.GetByIdAsync(id);
            if (user == null) return NotFound();

            var currentUserId = _currentUserService?.UserId != null && Guid.TryParse(_currentUserService.UserId, out var uid) ? uid : (Guid?)null;

            // Cascade delete associated Teacher profile(s) if any
            try
            {
                var teachers = await _teacherRepository.GetAllAsync(q => q.Where(t => t.UserId == user.Id));
                foreach (var t in teachers)
                {
                    await _teacherService.DeleteAsync(t.Id);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not cascade delete Teacher profile for user {UserId}", user.Id);
            }

            // Cascade delete associated Student profile(s) if any
            try
            {
                var students = await _studentRepository.GetAllAsync(q => q.Where(s => s.UserId == user.Id));
                foreach (var s in students)
                {
                    await _studentService.DeleteAsync(s.Id);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not cascade delete Student profile for user {UserId}", user.Id);
            }

            user.Deactivate();
            if (!string.IsNullOrWhiteSpace(user.Username))
            {
                user.Username = MakeUniqueAfterDelete(user.Username, user.Id, 100);
            }
            if (!string.IsNullOrWhiteSpace(user.Email))
            {
                user.UpdateEmail(MakeUniqueAfterDelete(user.Email, user.Id, 150));
            }
            user.IsDeleted = true;
            user.DeletedDate = DateTime.UtcNow;
            user.DeletedBy = currentUserId;
            await _userRepository.UpdateAsync(user);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete user {UserId}", id);
            return StatusCode(500, new { message = "Failed to delete user: " + ex.Message });
        }
    }

    private async Task SyncParentOnUserDeleteAsync(Student student)
    {
        var phone = student.ParentGuardianPhone?.Trim();
        var email = student.ParentGuardianEmail?.Trim().ToLower();

        if (string.IsNullOrEmpty(phone) && string.IsNullOrEmpty(email)) return;

        var parentUser = await _userRepository.Query()
            .IgnoreQueryFilters()
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Role != null && u.Role.RoleName == "Parent" && (
                (!string.IsNullOrEmpty(phone) && (u.Phone == phone || u.Email.ToLower() == phone.ToLower())) ||
                (!string.IsNullOrEmpty(email) && (u.Email.ToLower() == email || u.Phone == email))));

        if (parentUser == null) return;

        var otherActiveStudents = await _studentRepository.Query()
            .IgnoreQueryFilters()
            .Where(s => s.Id != student.Id && !s.IsDeleted && s.IsActive &&
                ((!string.IsNullOrEmpty(phone) && (s.ParentGuardianPhone == phone || (s.ParentGuardianEmail != null && s.ParentGuardianEmail.ToLower() == phone))) ||
                 (!string.IsNullOrEmpty(email) && ((s.ParentGuardianEmail != null && s.ParentGuardianEmail.ToLower() == email) || s.ParentGuardianPhone == email))))
            .ToListAsync();

        if (!otherActiveStudents.Any())
        {
            parentUser.IsDeleted = true;
            parentUser.DeletedDate = DateTime.UtcNow;
            parentUser.Deactivate();
            await _userRepository.UpdateAsync(parentUser);
        }
    }

    /// <summary>
    /// Restores a previously deleted/deactivated user (and any linked Teacher/Student
    /// profile) back to active status. Pairs with the soft-delete in Delete() above to
    /// satisfy the "Restore User" requirement without any data loss.
    /// </summary>
    [HttpPost("{id}/restore")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Restore(Guid id)
    {
        var user = await _userRepository.GetByIdAsync(id);
        if (user == null) return NotFound();

        user.Activate();
        await _userRepository.UpdateAsync(user);

        var teachers = await _teacherRepository.GetAllAsync(q => q.Where(t => t.UserId == user.Id));
        foreach (var t in teachers)
        {
            t.IsActive = true;
            await _teacherRepository.UpdateAsync(t);
        }

        var students = await _studentRepository.GetAllAsync(q => q.Where(s => s.UserId == user.Id));
        foreach (var s in students)
        {
            s.IsActive = true;
            await _studentRepository.UpdateAsync(s);
        }

        return Ok(new { message = "User restored successfully", is_active = user.IsActive });
    }

    /// <summary>
    /// Repairs and restores any student accounts that were mistakenly tagged with Parent role.
    /// Ensures every User linked to a Student profile has Role='Student' and IsParent=false.
    /// </summary>
    [HttpPost("fix-student-roles")]
    [Authorize(Policy = AppPolicies.AdminOnly)]
    public async Task<IActionResult> FixStudentRoles()
    {
        var studentRole = (await _roleRepository.GetAllAsync(q => q.Where(r => r.RoleName == "Student"))).FirstOrDefault();
        if (studentRole == null) return BadRequest(new { message = "Student role not found." });

        var students = await _studentRepository.Query()
            .IgnoreQueryFilters()
            .Where(s => s.UserId.HasValue)
            .ToListAsync();

        int fixedCount = 0;
        foreach (var s in students)
        {
            var u = await _userRepository.GetByIdAsync(s.UserId!.Value);
            if (u != null && (u.RoleId != studentRole.Id || u.IsParent))
            {
                u.SetRole(studentRole.Id);
                u.IsParent = false;
                await _userRepository.UpdateAsync(u);
                fixedCount++;
            }
        }

        return Ok(new { success = true, fixed_count = fixedCount, message = $"Successfully restored {fixedCount} student accounts." });
    }

    private static string MakeUniqueAfterDelete(string original, Guid id, int maxLength)
    {
        var suffix = $"~del~{id:N}";
        var keep = Math.Max(0, maxLength - suffix.Length);
        var trimmedOriginal = original.Length > keep ? original[..keep] : original;
        return trimmedOriginal + suffix;
    }
}

// Records use PascalCase properties that match snake_case JSON thanks to SnakeCaseLower policy
public class UserCreateRequest
{
    public string Email { get; set; } = "";
    public string? Username { get; set; }
    public string Password { get; set; } = "";
    public string Role { get; set; } = "Teacher";
    public Guid? SchoolId { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
}

public class UserUpdateRequest
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Username { get; set; }
    public string Role { get; set; } = "Teacher";
    public Guid? SchoolId { get; set; }
    public bool IsActive { get; set; }
}

public class UpdateProfileRequest
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Email { get; set; }
    public string? Username { get; set; }
    public string? Phone { get; set; }
    public string? ProfileImageUrl { get; set; }
    
    // Extended fields for Student/Teacher
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? BloodGroup { get; set; }
    public string? Address { get; set; }
    public string? ParentGuardianName { get; set; }
    public string? ParentGuardianPhone { get; set; }
    public string? ParentGuardianEmail { get; set; }
    public string? EmergencyContact { get; set; }
    public string? Qualification { get; set; }
    public string? Specialization { get; set; }
}

public class ResetPasswordBody
{
    public string? Password { get; set; }
}

