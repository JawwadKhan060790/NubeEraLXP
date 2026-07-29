using Microsoft.EntityFrameworkCore;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Repositories;
using NubeEra.Application.Interfaces.Services;
using NubeEra.Domain.Entities;
using NubeEra.Application.Interfaces.Security;

namespace NubeEra.Application.Services;

public class TeacherService : IGenericService<TeacherCreateDto, TeacherUpdateDto, TeacherDto>
{
    private readonly IGenericRepository<Teacher> _repository;
    private readonly IUserRepository _userRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly ITenantService       _tenantService;
    private readonly IGenericRepository<Role> _roleRepository;
    private readonly ITeacherSchoolService _teacherSchoolService;

    public TeacherService(
        IGenericRepository<Teacher> repository,
        IUserRepository userRepository,
        ICurrentUserService currentUserService,
        ITenantService tenantService,
        IGenericRepository<Role> roleRepository,
        ITeacherSchoolService teacherSchoolService)
    {
        _repository = repository;
        _userRepository = userRepository;
        _currentUserService = currentUserService;
        _tenantService       = tenantService;
        _roleRepository = roleRepository;
        _teacherSchoolService = teacherSchoolService;
    }

    public async Task<List<TeacherDto>> GetAllAsync()
    {
        var teachers = await _repository.GetAllAsync(q => q
            .Include(t => t.School)
            .Include(t => t.TeacherSchools).ThenInclude(ts => ts.School));

        return teachers.Select(MapToDto).ToList();
    }

    public async Task<TeacherDto?> GetByIdAsync(Guid id)
    {
        var t = await _repository.GetByIdAsync(id, q => q
            .Include(t => t.School)
            .Include(t => t.TeacherSchools).ThenInclude(ts => ts.School));
        if (t == null) return null;

        return MapToDto(t);
    }

    private static TeacherDto MapToDto(Teacher t) => new()
    {
        Id = t.Id,
        UserId = t.UserId,
        SchoolId = t.SchoolId,
        SchoolName = t.School?.Name ?? "",
        EmployeeId = t.EmployeeId,
        FirstName = t.FirstName,
        LastName = t.LastName,
        FullName = $"{t.FirstName} {t.LastName}",
        Email = t.Email,
        Phone = t.Phone,
        Gender = t.Gender,
        Address = t.Address,
        DateOfBirth = t.DateOfBirth,
        JoiningDate = t.JoiningDate,
        Qualification = t.Qualification,
        Specialization = t.Specialization,
        Salary = t.Salary,
        IsActive = t.IsActive,
        // Requirement 2/3: full multi-school membership list (Active + Inactive, non-deleted).
        Schools = t.TeacherSchools?
            .OrderByDescending(ts => ts.IsPrimary)
            .ThenBy(ts => ts.School?.Name)
            .Select(ts => new TeacherAvailableSchoolDto
            {
                SchoolId   = ts.SchoolId,
                SchoolName = ts.School?.Name ?? "",
                IsPrimary  = ts.IsPrimary,
                IsActive   = ts.IsActive
            }).ToList() ?? new List<TeacherAvailableSchoolDto>()
    };

    public async Task<Guid> CreateAsync(TeacherCreateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Password))
            throw new ArgumentException("Password is required when creating a teacher.");

        var schoolId = _tenantService.GetEffectiveSchoolIdOrEmpty(dto.SchoolId);

        // Check for duplicate email
        var existing = await _userRepository.GetByEmailAsync(dto.Email.ToLower().Trim());
        if (existing != null)
            throw new InvalidOperationException($"A user with email '{dto.Email}' already exists.");

        var teacherRole = (await _roleRepository.GetAllAsync(q => q.Where(r => r.RoleName == "Teacher"))).FirstOrDefault()
            ?? throw new InvalidOperationException("Teacher role not found in database.");

        var user = new User(
            email: dto.Email.ToLower().Trim(),
            passwordHash: BCrypt.Net.BCrypt.HashPassword(dto.Password),
            roleId: teacherRole.Id,
            schoolId: schoolId
        );
        user.FirstName = dto.FirstName;
        user.LastName = dto.LastName;
        user.Phone = dto.Phone;

        await _userRepository.AddAsync(user);

        var teacher = new Teacher
        {
            SchoolId = schoolId,
            UserId = user.Id,
            EmployeeId = dto.EmployeeId,
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Email = dto.Email,
            Phone = dto.Phone,
            Address = dto.Address,
            DateOfBirth = dto.DateOfBirth,
            Gender = dto.Gender,
            JoiningDate = dto.JoiningDate ?? DateTime.UtcNow,
            Qualification = dto.Qualification,
            Specialization = dto.Specialization,
            Salary = dto.Salary,
            IsActive = true
        };

        await _repository.AddAsync(teacher);

        // Requirement 2: seed the Teacher's multi-school memberships. SchoolIds (if
        // provided by the Create screen's multi-select) becomes the full set; SchoolId
        // is always included and treated as the primary/home school.
        var schoolIds = dto.SchoolIds?.Distinct().ToList() ?? new List<Guid>();
        if (!schoolIds.Contains(schoolId))
            schoolIds.Add(schoolId);

        await _teacherSchoolService.SyncTeacherSchoolsAsync(new TeacherSchoolAssignmentSetDto
        {
            TeacherId       = teacher.Id,
            SchoolIds       = schoolIds,
            PrimarySchoolId = schoolId,
            Notes           = "Initial assignment at Teacher creation."
        });

        return teacher.Id;
    }

    public async Task UpdateAsync(Guid id, TeacherUpdateDto dto)
    {
        var teacher = await _repository.GetByIdAsync(id)
            ?? throw new Exception("Teacher not found");

        var requesterRole = _currentUserService.Role?.ToLower() ?? "";
        var allowSchoolSelect = new[] { "superadmin", "admin", "staff", "principal" };
        if (allowSchoolSelect.Any(r => r.Equals(requesterRole, StringComparison.OrdinalIgnoreCase)) && dto.SchoolId.HasValue)
        {
            teacher.SchoolId = dto.SchoolId.Value;
        }
        
        teacher.EmployeeId = dto.EmployeeId;
        teacher.FirstName = dto.FirstName;
        teacher.LastName = dto.LastName;
        teacher.Email = dto.Email;
        teacher.Phone = dto.Phone;
        teacher.Address = dto.Address;
        teacher.DateOfBirth = dto.DateOfBirth;
        teacher.Gender = dto.Gender;
        teacher.JoiningDate = dto.JoiningDate;
        teacher.Qualification = dto.Qualification;
        teacher.Specialization = dto.Specialization;
        teacher.Salary = dto.Salary;
        teacher.IsActive = dto.IsActive;

        await _repository.UpdateAsync(teacher);

        // Sync with User entity
        var user = await _userRepository.GetByIdAsync(teacher.UserId);
        if (user != null)
        {
            user.FirstName = dto.FirstName;
            user.LastName = dto.LastName;
            user.Phone = dto.Phone;
            user.SchoolId = teacher.SchoolId;
            // Note: Email in User is private set, so we might need a method or check if it should be updated.
            // In User.cs: public string Email { get; private set; } = string.Empty;
            // For now, let's just update the name and phone which are public.
            await _userRepository.UpdateAsync(user);
        }

        // Requirement 2: sync multi-school memberships if the Edit screen's multi-select
        // supplied a school list. Only roles permitted to reassign SchoolId above may also
        // change the primary; everyone else can still add/restore additional Schools, but
        // the existing primary is left untouched (see TeacherSchoolAssignmentSetDto).
        if (dto.SchoolIds != null)
        {
            var schoolIds = dto.SchoolIds.Distinct().ToList();
            Guid? primarySchoolId = null;
            if (allowSchoolSelect.Any(r => r.Equals(requesterRole, StringComparison.OrdinalIgnoreCase)) && dto.SchoolId.HasValue)
            {
                primarySchoolId = dto.SchoolId.Value;
                if (!schoolIds.Contains(primarySchoolId.Value))
                    schoolIds.Add(primarySchoolId.Value);
            }

            await _teacherSchoolService.SyncTeacherSchoolsAsync(new TeacherSchoolAssignmentSetDto
            {
                TeacherId       = id,
                SchoolIds       = schoolIds,
                PrimarySchoolId = primarySchoolId,
                Notes           = "Updated via Teacher Edit screen."
            });
        }
    }

    public async Task DeleteAsync(Guid id)
    {
        var teacher = await _repository.GetByIdAsync(id)
            ?? throw new Exception("Teacher not found");

        var userId = teacher.UserId;

        // Requirement 2: retract every multi-school membership so no "active"
        // assignment outlives the Teacher record it belongs to. Must run before the
        // Teacher row itself is soft-deleted (this call still loads it normally).
        await _teacherSchoolService.RemoveAllForTeacherAsync(id, "Teacher record deleted.");

        // Delete the teacher record first to satisfy foreign key constraints
        await _repository.DeleteAsync(teacher);

        // Then delete the associated User record
        var user = await _userRepository.GetByIdAsync(userId);
        if (user != null)
        {
            await _userRepository.DeleteAsync(user);
        }
    }
}