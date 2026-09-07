using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NubeEra.Application.Common.Export;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Security;
using NubeEra.Application.Interfaces.Services;
using NubeEra.Application.Interfaces.Services.Export;

namespace NubeEra.API.Controllers.School;

[ApiController]
[Route("api/attendance")]
[Authorize]
public class AttendanceController : ControllerBase
{
    private readonly IAttendanceService _attendanceService;
    private readonly ICurrentUserService _currentUserService;
    private readonly IExcelExportService _excelExportService;

    private static readonly IReadOnlyList<ExportColumnDefinition> StudentAttendanceExportColumns = new List<ExportColumnDefinition>
    {
        ExportColumnDefinition.Text("student_name", "Student Name", 25),
        ExportColumnDefinition.Text("gender", "Gender", 15),
        ExportColumnDefinition.Text("date", "Date", 15),
        ExportColumnDefinition.Text("status", "Status", 15),
        ExportColumnDefinition.Text("remarks", "Remarks", 30),
        
    };

    private static readonly IReadOnlyList<ExportColumnDefinition> TeacherAttendanceExportColumns = new List<ExportColumnDefinition>
    {
        ExportColumnDefinition.Text("teacher_name", "Teacher Name", 25),
        ExportColumnDefinition.Text("gender", "Gender", 15),
        ExportColumnDefinition.Text("date", "Date", 15),
        ExportColumnDefinition.Text("status", "Status", 15),
        ExportColumnDefinition.Text("remarks", "Remarks", 30),
    };

    public AttendanceController(
        IAttendanceService attendanceService,
        ICurrentUserService currentUserService,
        IExcelExportService excelExportService)
    {
        _attendanceService = attendanceService;
        _currentUserService = currentUserService;
        _excelExportService = excelExportService;
    }

    [HttpGet("teacher-report")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> GetTeacherReport([FromQuery] int month, [FromQuery] int year)
    {
        var teacherId = _currentUserService.TeacherId ?? Guid.Empty;
        if (teacherId == Guid.Empty) return BadRequest("Teacher identity not found");

        var report = await _attendanceService.GetTeacherMonthlyReportAsync(teacherId, month, year);
        return Ok(report);
    }

    [HttpGet("students")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> GetStudentAttendance([FromQuery] Guid gradeId, [FromQuery] DateTime date, [FromQuery] Guid? sectionId = null)
    {
        var attendances = await _attendanceService.GetStudentAttendanceAsync(gradeId, date, sectionId);
        return Ok(attendances);
    }

    [HttpPost("save")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> SaveAttendance([FromBody] List<AttendanceDto> dtos)
    {
        await _attendanceService.SaveAttendanceAsync(dtos);
        return Ok(new { message = "Attendance saved successfully" });
    }

    [HttpGet("teachers")]
    [Authorize(Policy = "StaffOnly")]
    public async Task<IActionResult> GetTeacherAttendance([FromQuery] DateTime date, [FromQuery] Guid? schoolId)
    {
        var attendances = await _attendanceService.GetTeacherAttendanceAsync(date, schoolId);
        return Ok(attendances);
    }

    [HttpPost("teachers/save")]
    [Authorize(Policy = "StaffOnly")]
    public async Task<IActionResult> SaveTeacherAttendance([FromBody] List<AttendanceDto> dtos)
    {
        await _attendanceService.SaveAttendanceAsync(dtos);
        return Ok(new { message = "Teacher attendance saved successfully" });
    }

    /// <summary>
    /// GET /api/attendance/my?month=6&amp;year=2026
    /// Student: view own monthly attendance report.
    /// </summary>
    [HttpGet("my")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> GetMyAttendance([FromQuery] int month, [FromQuery] int year)
    {
        var studentId = _currentUserService.StudentId;
        if (!studentId.HasValue)
            return BadRequest(new { message = "Student profile not linked to this account." });

        if (month < 1 || month > 12 || year < 2000)
            return BadRequest(new { message = "Invalid month or year." });

        var report = await _attendanceService.GetMyAttendanceAsync(studentId.Value, month, year);
        return Ok(report);
    }

    [HttpGet("export/students")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> ExportStudents([FromQuery] Guid gradeId, [FromQuery] DateTime date, [FromQuery] Guid? sectionId = null)
    {
        var attendances = await _attendanceService.GetStudentAttendanceAsync(gradeId, date, sectionId);
        var rows = attendances.Select(a => (IReadOnlyDictionary<string, object?>)new Dictionary<string, object?>
        {
            ["student_name"] = a.StudentName,
            ["gender"] = a.Gender,
            ["date"] = a.Date.ToString("yyyy-MM-dd"),
            ["status"] = a.Status,
            ["remarks"] = a.Remarks,
        }).ToList();

        var configuration = ExportConfiguration.Create(
            fileName: $"student-attendance-{date:yyyyMMdd}",
            sheetName: "Student Attendance",
            columns: StudentAttendanceExportColumns,
            title: $"Student Attendance - {date:yyyy-MM-dd}");

        var fileBytes = _excelExportService.GenerateExcel(rows, configuration);
        return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"{configuration.FileName}.xlsx");
    }

    [HttpGet("export/teachers")]
    [Authorize(Policy = "StaffOnly")]
    public async Task<IActionResult> ExportTeachers([FromQuery] DateTime date, [FromQuery] Guid? schoolId = null)
    {
        var attendances = await _attendanceService.GetTeacherAttendanceAsync(date, schoolId);
        var rows = attendances.Select(a => (IReadOnlyDictionary<string, object?>)new Dictionary<string, object?>
        {
            ["teacher_name"] = a.TeacherName,
            ["gender"] = a.Gender,
            ["date"] = a.Date.ToString("yyyy-MM-dd"),
            ["status"] = a.Status,
            ["remarks"] = a.Remarks,
        }).ToList();

        var configuration = ExportConfiguration.Create(
            fileName: $"teacher-attendance-{date:yyyyMMdd}",
            sheetName: "Teacher Attendance",
            columns: TeacherAttendanceExportColumns,
            title: $"Teacher Attendance - {date:yyyy-MM-dd}");

        var fileBytes = _excelExportService.GenerateExcel(rows, configuration);
        return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"{configuration.FileName}.xlsx");
    }
}

