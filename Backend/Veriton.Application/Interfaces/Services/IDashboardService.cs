using Veriton.Application.DTOs;

namespace Veriton.Application.Interfaces.Services;

public interface IDashboardService
{
    Task<DashboardStatsDto> GetStatsAsync(Guid? schoolId = null, string? schoolFilter = null);
    Task<StudentDashboardDto?> GetStudentDashboardAsync(Guid? userId, Guid? studentId = null, string? subjectFilter = null);
    Task<TeacherDashboardDto> GetTeacherDashboardAsync(Guid? userId, Guid? teacherId = null, string? gradeFilter = null);
}
