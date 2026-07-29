using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NubeEra.Application.Common.Export;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Repositories;
using NubeEra.Application.Interfaces.Services;
using NubeEra.Application.Interfaces.Services.Export;
using NubeEra.API.Controllers.Auth;
using NubeEra.Domain.Common;
using NubeEra.Domain.Entities;

namespace NubeEra.API.Controllers.People;

[ApiController]
[Route("api/teachers")]
[Authorize]
public class TeachersController : ControllerBase
{
    private readonly IGenericService<TeacherCreateDto, TeacherUpdateDto, TeacherDto> _service;
    private readonly IExcelExportService _excelExportService;
    private readonly IUserRepository _userRepository;
    private readonly IGenericRepository<Teacher> _teacherRepository;
    private readonly IGenericRepository<Role> _roleRepository;

    // Declarative column map for the Teachers Excel export — mirrors the pattern
    // established in StudentsController.StudentExportColumns. Same shared
    // IExcelExportService does the actual rendering; this module only describes
    // its own column shape.
    private static readonly IReadOnlyList<ExportColumnDefinition> TeacherExportColumns = new List<ExportColumnDefinition>
    {
        ExportColumnDefinition.Text("employee_id", "Employee ID", 16),
        ExportColumnDefinition.Text("full_name", "Full Name", 26),
        ExportColumnDefinition.Text("school_name", "School", 24),
        ExportColumnDefinition.Text("email", "Email", 30),
        ExportColumnDefinition.Text("phone", "Phone", 16),
        ExportColumnDefinition.Text("gender", "Gender", 10),
        ExportColumnDefinition.Text("qualification", "Qualification", 22),
        ExportColumnDefinition.Text("specialization", "Specialization", 22),
        ExportColumnDefinition.Date("date_of_birth", "Date of Birth", 14),
        ExportColumnDefinition.Date("joining_date", "Joining Date", 14),
        ExportColumnDefinition.Currency("salary", "Salary", 14),
        ExportColumnDefinition.Boolean("is_active", "Active", 10),
    };

    public TeachersController(
        IGenericService<TeacherCreateDto, TeacherUpdateDto, TeacherDto> service,
        IExcelExportService excelExportService,
        IUserRepository userRepository,
        IGenericRepository<Teacher> teacherRepository,
        IGenericRepository<Role> roleRepository)
    {
        _service = service;
        _excelExportService = excelExportService;
        _userRepository = userRepository;
        _teacherRepository = teacherRepository;
        _roleRepository = roleRepository;
    }

    [HttpGet]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> GetAll()
        => Ok(await _service.GetAllAsync());

    /// <summary>
    /// Export the teacher directory to Excel (.xlsx). See
    /// <see cref="StudentsController.Export"/> for the framework rationale — same
    /// reused query, same shared engine, same authorization tier as the list view.
    /// Salary is included only because PrincipalOnly/TeacherOnly viewers of this
    /// list already see it via GetAll/GetById; export never exposes more than the
    /// screen does.
    /// </summary>
    [HttpGet("export")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> Export()
    {
        var teachers = await _service.GetAllAsync();

        var rows = teachers.Select(t => (IReadOnlyDictionary<string, object?>)new Dictionary<string, object?>
        {
            ["employee_id"] = t.EmployeeId,
            ["full_name"] = t.FullName,
            ["school_name"] = t.SchoolName,
            ["email"] = t.Email,
            ["phone"] = t.Phone,
            ["gender"] = t.Gender,
            ["qualification"] = t.Qualification,
            ["specialization"] = t.Specialization,
            ["date_of_birth"] = t.DateOfBirth,
            ["joining_date"] = t.JoiningDate,
            ["salary"] = t.Salary,
            ["is_active"] = t.IsActive,
        }).ToList();

        var configuration = ExportConfiguration.Create(
            fileName: $"teachers-export-{DateTime.UtcNow:yyyyMMdd-HHmmss}",
            sheetName: "Teachers",
            columns: TeacherExportColumns,
            title: "Teacher Directory");

        var fileBytes = _excelExportService.GenerateExcel(rows, configuration);
        return File(
            fileBytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"{configuration.FileName}.xlsx");
    }

    [HttpGet("{id}")]
    [Authorize(Policy = "PrincipalOnly")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var teacher = await _service.GetByIdAsync(id);
        return teacher == null ? NotFound() : Ok(teacher);
    }

    /// <summary>
    /// Create a teacher. Staff and above can create.
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "PrincipalOnly")]
    public async Task<IActionResult> Create(TeacherCreateDto dto)
    {
        try
        {
            return Ok(new { id = await _service.CreateAsync(dto) });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "PrincipalOnly")]
    public async Task<IActionResult> Update(Guid id, TeacherUpdateDto dto)
    {
        await _service.UpdateAsync(id, dto);
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "PrincipalOnly")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }

    /// <summary>
    /// Reset (or recreate) a teacher's user account password.
    /// 1. Tries UserId link → falls back to email lookup.
    /// 2. If still no user found, creates a fresh user account and re-links it to
    ///    the teacher profile so future logins work.
    /// </summary>
    [HttpPut("{id}/reset-password")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> ResetPassword(Guid id, [FromBody] ResetPasswordBody? body)
    {
        var teacher = await _service.GetByIdAsync(id);
        if (teacher == null) return NotFound(new { message = "Teacher not found." });

        var passwordToSet = !string.IsNullOrWhiteSpace(body?.Password)
            ? body!.Password
            : "Teacher@123";

        // 1. Try direct UserId link
        User? user = teacher.UserId.HasValue
            ? await _userRepository.GetByIdAsync(teacher.UserId.Value, q => q.Include(u => u.Role))
            : null;

        // 2. Fall back to email lookup (covers de-synced UserId rows)
        if (user == null)
            user = await _userRepository.GetByEmailAsync(teacher.Email, q => q.Include(u => u.Role));

        // 3. No user account at all — recreate it and re-link the teacher profile
        if (user == null)
        {
            var teacherRole = (await _roleRepository.GetAllAsync(
                q => q.Where(r => r.RoleName == "Teacher")))
                .FirstOrDefault();

            if (teacherRole == null)
                return StatusCode(500, new { message = "Teacher role not found in the database." });

            user = new User(
                email: teacher.Email.ToLower().Trim(),
                passwordHash: BCrypt.Net.BCrypt.HashPassword(passwordToSet),
                roleId: teacherRole.Id,
                schoolId: teacher.SchoolId
            );
            user.FirstName = teacher.FirstName;
            user.LastName = teacher.LastName;
            user.Phone = teacher.Phone;
            await _userRepository.AddAsync(user);

            // Re-link teacher profile → new user
            var teacherEntity = await _teacherRepository.GetByIdAsync(id);
            if (teacherEntity != null)
            {
                teacherEntity.UserId = user.Id;
                await _teacherRepository.UpdateAsync(teacherEntity);
            }

            return Ok(new { message = "User account recreated and password set successfully." });
        }

        // 4. User exists — just update the password
        user.UpdatePassword(BCrypt.Net.BCrypt.HashPassword(passwordToSet));
        await _userRepository.UpdateAsync(user);

        return Ok(new { message = "Password reset successfully." });
    }
}
