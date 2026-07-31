using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using Veriton.Application.Interfaces.Repositories;
using Veriton.Domain.Common;
using Veriton.Domain.Entities;
using Veriton.Application.Interfaces.Security;

namespace Veriton.API.Controllers.Auth;

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

    public UsersController(
        IUserRepository userRepository, 
        ICurrentUserService currentUserService,
        IGenericRepository<Student> studentRepository,
        IGenericRepository<Teacher> teacherRepository,
        IGenericRepository<Role> roleRepository, ITenantService tenantService)
    {
        _userRepository = userRepository;
        _currentUserService = currentUserService;
        _tenantService      = tenantService;
        _studentRepository = studentRepository;
        _teacherRepository = teacherRepository;
        _roleRepository = roleRepository;
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
            var userMatches = await _userRepository.GetAllAsync(q => q.Where(u => u.Email.ToLower() == lower && u.IsActive));
            var studentMatches = await _studentRepository.GetAllAsync(q => q.Where(s => s.Email != null && s.Email.ToLower() == lower && s.IsActive));
            var teacherMatches = await _teacherRepository.GetAllAsync(q => q.Where(t => t.Email != null && t.Email.ToLower() == lower && t.IsActive));
            exists = userMatches.Any() || studentMatches.Any() || teacherMatches.Any();
        }
        else if (normalizedField == "phone")
        {
            var userMatches = await _userRepository.GetAllAsync(q => q.Where(u => u.Phone == normalizedValue && u.IsActive));
            var studentMatches = await _studentRepository.GetAllAsync(q => q.Where(s => s.Phone == normalizedValue && s.IsActive));
            var teacherMatches = await _teacherRepository.GetAllAsync(q => q.Where(t => t.Phone == normalizedValue && t.IsActive));
            exists = userMatches.Any() || studentMatches.Any() || teacherMatches.Any();
        }
        else
        {
            return BadRequest(new { message = "field must be 'email' or 'phone'" });
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
        var users = await _userRepository.GetAllAsync(q => q.Include(u => u.Role).Include(u => u.School));
        
        IEnumerable<User> filtered = users;
        
        // Tenant scoping: restricted roles always see their school; non-restricted
        // use the school selected via the UI (X-School-Id header → JWT fallback).
        var effSchool = _tenantService.GetEffectiveSchoolId(schoolId);
        if (effSchool.HasValue)
            filtered = filtered.Where(u => u.SchoolId == effSchool);
        
        if (!string.IsNullOrEmpty(role))
            filtered = filtered.Where(u => u.Role.RoleName == role);
            

        var response = filtered.Select(u => new
        {
            id = u.Id,
            email = u.Email,
            first_name = u.FirstName,
            last_name = u.LastName,
            full_name = $"{u.FirstName} {u.LastName}",
            role = u.Role.RoleName,
            utype = u.Role.RoleName switch
            {
                "SuperAdmin" => "admin",
                "Principal" => "principal",
                _ => u.Role.RoleName.ToLower()
            },
            school_id = u.SchoolId,
            school_name = u.School?.Name,
            is_active = u.IsActive,
            phone = u.Phone,
            created_at = u.CreatedAt
        });

        return Ok(response);
    }

    [HttpPost]
    [Authorize(Policy = "StaffOnly")]
    public async Task<IActionResult> Create(UserCreateRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        Console.WriteLine($"[UserCreate] Role: {request.Role}, Email: {request.Email}, SchoolId: {request.SchoolId}");

        // Enforce the same standard password policy used at Register/ChangePassword
        // (see RegisterRequestValidator) — this endpoint previously accepted any
        // non-empty password, including single-character ones, when an Admin/Staff
        // created a new account.
        if (string.IsNullOrEmpty(request.Password) || request.Password.Length < 8)
            return BadRequest(new { message = "Password must be at least 8 characters." });
        if (!System.Text.RegularExpressions.Regex.IsMatch(request.Password, "[A-Z]"))
            return BadRequest(new { message = "Password must contain at least one uppercase letter." });
        if (!System.Text.RegularExpressions.Regex.IsMatch(request.Password, "[0-9]"))
            return BadRequest(new { message = "Password must contain at least one digit." });

        var schoolId = _tenantService.GetEffectiveSchoolIdOrEmpty(request.SchoolId);
        var existingUser = await _userRepository.GetByEmailAsync(request.Email.Trim().ToLower(), null);
        if (existingUser != null)
            return BadRequest(new { message = "User with this email already exists" });

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        var roleObj = (await _roleRepository.GetAllAsync(q => q.Where(r => r.RoleName == request.Role))).FirstOrDefault();
        if (roleObj == null)
            return BadRequest(new { message = $"Role '{request.Role}' not found in database." });

        // Student accounts must be created through POST /students (StudentService.CreateAsync),
        // which captures Grade/Section/StudentId and keeps the User + Student rows linked from
        // creation. This generic endpoint has no grade-assignment fields, and previously let a
        // "Student" role user be created with no Student profile at all (silently defaulting to
        // Grade 1 once one was eventually attached) — a second, disconnected identity that
        // desyncs from anything edited later on the Students panel. Reject it here as well as
        // hiding the option in the UI, so any direct API caller hits the same guardrail.
        if (roleObj.RoleName.Equals("Student", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Student accounts must be created from the Students panel so grade, division and login details stay in sync." });

        // The platform is restricted to a single Admin account (QA requirement).
        // SuperAdmin is unaffected — this only restricts the "Admin" role itself.
        if (roleObj.RoleName.Equals("Admin", StringComparison.OrdinalIgnoreCase))
        {
            var existingAdmins = await _userRepository.GetAllAsync(q => q.Include(u => u.Role).Where(u => u.Role.RoleName == "Admin"));
            if (existingAdmins.Any())
                return BadRequest(new { message = "An Admin account already exists. Only one Admin account is permitted on this platform." });
        }

        var user = new User(request.Email.Trim().ToLower(), passwordHash, roleObj.Id, schoolId);
        user.FirstName = request.FirstName;
        user.LastName = request.LastName;

        await _userRepository.AddAsync(user);

        // If the role is Teacher, also create a Teacher profile automatically
        if (request.Role.Equals("Teacher", StringComparison.OrdinalIgnoreCase))
        {
            var teacher = new Teacher
            {
                UserId = user.Id,
                SchoolId = schoolId,
                FirstName = request.FirstName ?? "",
                LastName = request.LastName ?? "",
                Email = request.Email.Trim().ToLower(),
                EmployeeId = "T-" + DateTime.UtcNow.Ticks.ToString().Substring(10), // Generate a default ID
                JoiningDate = DateTime.UtcNow,
                IsActive = true
            };
            await _teacherRepository.AddAsync(teacher);
        }

        return Ok(new { id = user.Id, message = "User created successfully" });
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "StaffOnly")]
    public async Task<IActionResult> Update(Guid id, UserUpdateRequest request)
    {
        var user = await _userRepository.GetByIdAsync(id, q => q.Include(u => u.Role));
        if (user == null) return NotFound();

        user.FirstName = request.FirstName;
        user.LastName = request.LastName;

        var roleObj = (await _roleRepository.GetAllAsync(q => q.Where(r => r.RoleName == request.Role))).FirstOrDefault();
        if (roleObj == null)
            return BadRequest(new { message = $"Role '{request.Role}' not found in database." });

        // Same single-Admin restriction as Create() — only enforced when this
        // update would actually change someone INTO the Admin role.
        if (roleObj.RoleName.Equals("Admin", StringComparison.OrdinalIgnoreCase) && user.RoleId != roleObj.Id)
        {
            var existingAdmins = await _userRepository.GetAllAsync(q => q.Include(u => u.Role).Where(u => u.Role.RoleName == "Admin" && u.Id != user.Id));
            if (existingAdmins.Any())
                return BadRequest(new { message = "An Admin account already exists. Only one Admin account is permitted on this platform." });
        }

        user.SetRole(roleObj.Id);
        
        if (_tenantService.CanSelectSchool())
            user.SchoolId = request.SchoolId;
        
        if (request.IsActive) user.Activate();
        else user.Deactivate();

        await _userRepository.UpdateAsync(user);

        // Sync SchoolId to linked Teacher/Student profiles
        if (user.SchoolId.HasValue)
        {
            var teachers = await _teacherRepository.GetAllAsync(q => q.Where(t => t.UserId == user.Id));
            foreach (var t in teachers)
            {
                t.SchoolId = user.SchoolId.Value;
                await _teacherRepository.UpdateAsync(t);
            }

            var students = await _studentRepository.GetAllAsync(q => q.Where(s => s.UserId == user.Id));
            foreach (var s in students)
            {
                s.SchoolId = user.SchoolId.Value;
                await _studentRepository.UpdateAsync(s);
            }

            // If the role was just changed to Teacher and this user has no linked
            // Teacher profile yet, create one now — mirroring the auto-create logic
            // in Create() above. Without this, promoting an existing user to the
            // Teacher role left them missing from the Teacher panel entirely, which
            // is what QA reported as a teacher-count mismatch between the Users and
            // Teacher panels.
            if (roleObj.RoleName.Equals("Teacher", StringComparison.OrdinalIgnoreCase) && !teachers.Any())
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

    /// <summary>
    /// Toggle user active/hold status
    /// </summary>
    [HttpPut("{id}/toggle-status")]
    [Authorize(Policy = "StaffOnly")]
    public async Task<IActionResult> ToggleStatus(Guid id)
    {
        var user = await _userRepository.GetByIdAsync(id);
        if (user == null) return NotFound();

        if (user.IsActive) user.Deactivate();
        else user.Activate();

        await _userRepository.UpdateAsync(user);
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
        var targetRole = user.Role.RoleName;

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
            passwordToSet = user.Role.RoleName switch
            {
                "Student" => "Student@123",
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
    /// hard delete: hard-deleting previously cascaded into permanently removing the
    /// linked Teacher/Student rows, which
    ///   (a) orphaned dependent records (Attendance, Results, EventRegistrations,
    ///       LessonCompletions, Tickets, Orders, ...) that still reference the
    ///       deleted StudentId/TeacherId, risking FK errors and broken reports, and
    ///   (b) made the "Restore User" capability required by the spec impossible,
    ///       and was inconsistent with StudentService.DeleteAsync, which already
    ///       soft-deletes (IsActive = false) for exactly these reasons.
    /// Deactivating here keeps history intact, keeps parent dashboards / attendance /
    /// reports consistent, and lets ToggleStatus / Update (IsActive = true) restore
    /// the account later without data loss.
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var user = await _userRepository.GetByIdAsync(id);
        if (user == null) return NotFound();

        user.Deactivate();
        await _userRepository.UpdateAsync(user);

        // Deactivate associated Teacher profile(s) if any (soft delete, preserves history)
        var teachers = await _teacherRepository.GetAllAsync(q => q.Where(t => t.UserId == user.Id));
        foreach (var t in teachers)
        {
            t.IsActive = false;
            await _teacherRepository.UpdateAsync(t);
        }

        // Deactivate associated Student profile(s) if any (soft delete, preserves history;
        // also keeps parent dashboards able to show the child's prior records rather than
        // having them vanish/break because the row no longer exists)
        var students = await _studentRepository.GetAllAsync(q => q.Where(s => s.UserId == user.Id));
        foreach (var s in students)
        {
            s.IsActive = false;
            await _studentRepository.UpdateAsync(s);
        }

        return NoContent();
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
}

// Records use PascalCase properties that match snake_case JSON thanks to SnakeCaseLower policy
public class UserCreateRequest
{
    public string Email { get; set; } = "";
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
    public string Role { get; set; } = "Teacher";
    public Guid? SchoolId { get; set; }
    public bool IsActive { get; set; }
}

public class UpdateProfileRequest
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
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

