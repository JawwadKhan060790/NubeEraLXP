using Veriton.Application.DTOs;

namespace Veriton.Application.Interfaces.Services;

public interface IAttendanceService
{
    Task<TeacherAttendanceReportDto> GetTeacherMonthlyReportAsync(Guid teacherId, int month, int year);
    Task<List<AttendanceDto>> GetStudentAttendanceAsync(Guid gradeId, DateTime date, Guid? sectionId = null);
    Task<List<AttendanceDto>> GetTeacherAttendanceAsync(DateTime date, Guid? schoolId = null);
    Task SaveAttendanceAsync(List<AttendanceDto> dtos);
    /// <summary>Returns attendance records for the calling student (scoped by StudentId JWT claim).</summary>
    Task<TeacherAttendanceReportDto> GetMyAttendanceAsync(Guid studentId, int month, int year);
}
