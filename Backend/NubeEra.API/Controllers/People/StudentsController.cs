using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using NubeEra.Application.Common.Export;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Services;
using NubeEra.Application.Interfaces.Services.Export;
using NubeEra.Application.Pagination;
using NubeEra.Application.Interfaces.Repositories;
using NubeEra.Domain.Entities;

namespace NubeEra.API.Controllers.People;

[ApiController]
[Route("api/students")]
[Authorize]
public class StudentsController : ControllerBase
{
    private readonly IStudentService _service;
    private readonly IStudentPromotionService _promotionService;
    private readonly IExcelExportService _excelExportService;
    private readonly ILogger<StudentsController> _logger;
    private readonly IUserRepository _userRepository;
    private readonly IGenericRepository<Student> _studentRepository;

    // Declarative column map for the Students Excel export — the ONLY place this
    // module describes its export shape. Generation itself is fully delegated to
    // the shared IExcelExportService (see ExcelExportService), so adding/removing
    // a column here is the entire change surface; no per-module export engine.
    private static readonly IReadOnlyList<ExportColumnDefinition> StudentExportColumns = new List<ExportColumnDefinition>
    {
        ExportColumnDefinition.Text("student_id", "Student ID", 16),
        ExportColumnDefinition.Text("full_name", "Full Name", 26),
        ExportColumnDefinition.Text("roll_no", "Roll No.", 12),
        ExportColumnDefinition.Text("school_name", "School", 24),
        ExportColumnDefinition.Text("grade_name", "Grade", 14),
        ExportColumnDefinition.Text("email", "Email", 30),
        ExportColumnDefinition.Text("phone", "Phone", 16),
        ExportColumnDefinition.Text("gender", "Gender", 10),
        ExportColumnDefinition.Date("date_of_birth", "Date of Birth", 14),
        ExportColumnDefinition.Text("parent_guardian_name", "Parent / Guardian", 24),
        ExportColumnDefinition.Text("parent_guardian_phone", "Parent Phone", 16),
        ExportColumnDefinition.Date("admission_date", "Admission Date", 14),
        ExportColumnDefinition.Number("progress_percentage", "Progress %", 12, "0.0"),
        ExportColumnDefinition.Boolean("is_active", "Active", 10),
    };

    public StudentsController(
        IStudentService service,
        IStudentPromotionService promotionService,
        IExcelExportService excelExportService,
        ILogger<StudentsController> logger,
        IUserRepository userRepository,
        IGenericRepository<Student> studentRepository)
    {
        _service = service;
        _promotionService = promotionService;
        _excelExportService = excelExportService;
        _logger = logger;
        _userRepository = userRepository;
        _studentRepository = studentRepository;
    }

    /// <summary>
    /// Paginated student list — the primary list endpoint.
    ///
    /// BREAKING CHANGE (performance fix): This endpoint previously returned the full
    /// student list without pagination, which caused 500 errors under large datasets.
    /// It now accepts pagination parameters and returns a <see cref="PagedResponse{T}"/>.
    ///
    /// Query parameters (all optional):
    ///   pageNumber    — 1-based page (default 1)
    ///   pageSize      — records per page (default 20, max 200)
    ///   search        — free-text filter on name / email / student ID
    ///   gradeId       — filter by grade UUID
    ///   schoolId      — filter by school UUID (ignored for school-scoped callers)
    ///   isActive      — true/false (default: active only)
    ///   sortBy        — column name to sort by
    ///   sortDirection — ASC / DESC (default ASC)
    /// </summary>
    [HttpGet]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> GetAll([FromQuery] PaginationRequest request)
    {
        try
        {
            var result = await _service.GetPagedAsync(request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "GET /api/students failed. PageNumber={PageNumber}, PageSize={PageSize}, Search={Search}, GradeId={GradeId}",
                request.PageNumber, request.PageSize, request.Search, request.GradeId);
            return StatusCode(500, new
            {
                message = "Failed to retrieve students. The server has logged the error details."
            });
        }
    }

    /// <summary>
    /// Alias for the paginated GET /api/students endpoint — kept for backward compatibility
    /// with any code that was already calling /api/students/paged.
    /// </summary>
    [HttpGet("paged")]
    [Authorize(Policy = "TeacherOnly")]
    public Task<IActionResult> GetPaged([FromQuery] PaginationRequest request)
        => GetAll(request);

    /// <summary>
    /// Export the student directory to Excel (.xlsx). Reuses the same authorized,
    /// already-role-scoped <see cref="IGenericService{TCreate,TUpdate,TResponse}.GetAllAsync"/>
    /// query as the list endpoint above — no parallel data-access path — and routes
    /// formatting through the shared <see cref="IExcelExportService"/> so every
    /// module's export goes through one engine. Same authorization tier as the list
    /// endpoint: a user can only export what they could already see on screen.
    /// </summary>
    [HttpGet("export")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> Export()
    {
        var students = await _service.GetAllAsync();

        var rows = students.Select(s => (IReadOnlyDictionary<string, object?>)new Dictionary<string, object?>
        {
            ["student_id"] = s.StudentId,
            ["full_name"] = s.FullName,
            ["roll_no"] = s.RollNo,
            ["school_name"] = s.SchoolName,
            ["grade_name"] = s.GradeName,
            ["email"] = s.Email,
            ["phone"] = s.Phone,
            ["gender"] = s.Gender,
            ["date_of_birth"] = s.DateOfBirth,
            ["parent_guardian_name"] = s.ParentGuardianName,
            ["parent_guardian_phone"] = s.ParentGuardianPhone,
            ["admission_date"] = s.AdmissionDate,
            ["progress_percentage"] = s.ProgressPercentage,
            ["is_active"] = s.IsActive,
        }).ToList();

        var configuration = ExportConfiguration.Create(
            fileName: $"students-export-{DateTime.UtcNow:yyyyMMdd-HHmmss}",
            sheetName: "Students",
            columns: StudentExportColumns,
            title: "Student Directory");

        var fileBytes = _excelExportService.GenerateExcel(rows, configuration);
        return File(
            fileBytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"{configuration.FileName}.xlsx");
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "SuperAdmin,Admin,Principal,Staff,Teacher,Student,Parent")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var student = await _service.GetByIdAsync(id);
        return student == null ? NotFound() : Ok(student);
    }

    /// <summary>
    /// Create a student. Teacher and above can create.
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> Create(StudentCreateDto dto)
        => Ok(new { id = await _service.CreateAsync(dto) });

    [HttpPut("{id}")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> Update(Guid id, StudentUpdateDto dto)
    {
        await _service.UpdateAsync(id, dto);
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }

    /// <summary>
    /// Promote or transfer a single student to a new grade (and, optionally, a new
    /// school). Principal-and-above only — mirrors GradesController's authorization
    /// level since this mutates a student's grade/school assignment. See
    /// StudentPromotionRequestDto for the documented scope (single-student slice).
    /// </summary>
    [HttpPost("{id}/promote")]
    [Authorize(Policy = "PrincipalOnly")]
    public async Task<IActionResult> Promote(Guid id, StudentPromotionRequestDto dto)
    {
        await _promotionService.PromoteOrTransferAsync(id, dto);
        return Ok(new { message = "Student promoted/transferred successfully." });
    }

    [HttpPost("upload-csv")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> UploadCsv(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded");

        var created = await _service.BulkImportCsvAsync(file.OpenReadStream());
        return Ok(new { message = $"Bulk import successful. {created} student(s) created." });
    }

    /// <summary>
    /// Reset parent/guardian login password for a student.
    /// Staff, Admin, SuperAdmin, Teacher, and Principal can reset.
    /// </summary>
    [HttpPut("{id}/reset-parent-password")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> ResetParentPassword(Guid id, [FromBody] NubeEra.API.Controllers.Auth.ResetPasswordBody? request)
    {
        if (string.IsNullOrWhiteSpace(request?.Password))
            return BadRequest(new { message = "Password is required" });

        if (request.Password.Length < 6)
            return BadRequest(new { message = "Password must be at least 6 characters long." });

        await _service.ResetParentPasswordAsync(id, request.Password);
        return Ok(new { message = "Parent login password reset successfully." });
    }

    /// <summary>
    /// Reset student login password by student ID (or user ID).
    /// Staff, Admin, SuperAdmin, Teacher, and Principal can reset.
    /// </summary>
    [HttpPut("{id}/reset-password")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> ResetStudentPassword(Guid id, [FromBody] NubeEra.API.Controllers.Auth.ResetPasswordBody? request)
    {
        if (string.IsNullOrWhiteSpace(request?.Password))
            return BadRequest(new { message = "Password is required" });

        if (request.Password.Length < 6)
            return BadRequest(new { message = "Password must be at least 6 characters long." });

        var student = await _studentRepository.GetByIdAsync(id);
        User? user = null;

        if (student != null && student.UserId.HasValue && student.UserId.Value != Guid.Empty)
        {
            user = await _userRepository.GetByIdAsync(student.UserId.Value);
        }
        else
        {
            user = await _userRepository.GetByIdAsync(id);
        }

        if (user == null)
            return NotFound(new { message = "Student user account not found." });

        user.UpdatePassword(BCrypt.Net.BCrypt.HashPassword(request.Password));
        await _userRepository.UpdateAsync(user);

        return Ok(new { message = "Student login password updated successfully." });
    }

    /// <summary>
    /// GET /api/students/next-id?schoolId={schoolId}
    /// Returns the next sequential Student ID for a school (e.g. DA-260005)
    /// </summary>
    [HttpGet("next-id")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> GetNextStudentId([FromQuery] Guid schoolId)
    {
        if (schoolId == Guid.Empty)
            return BadRequest(new { message = "School ID is required." });

        var nextId = await _service.GetNextStudentIdAsync(schoolId);
        return Ok(new { student_id = nextId });
    }
}
