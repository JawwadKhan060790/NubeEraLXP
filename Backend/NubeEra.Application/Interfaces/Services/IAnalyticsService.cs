using NubeEra.Application.DTOs.Dashboard;

namespace NubeEra.Application.Interfaces.Services;

public interface IAnalyticsService
{
    Task<SuperAdminAnalyticsDto>  GetSuperAdminAnalyticsAsync();
    Task<AdminAnalyticsDto>       GetAdminAnalyticsAsync(Guid? schoolId);
    Task<PrincipalAnalyticsDto>   GetPrincipalAnalyticsAsync(Guid schoolId);
    Task<TeacherAnalyticsDto>     GetTeacherAnalyticsAsync(Guid teacherUserId, Guid schoolId);
    Task<StudentAnalyticsDto>     GetStudentAnalyticsAsync(Guid? studentUserId, Guid? studentId, Guid schoolId);
    Task<ParentAnalyticsDto>      GetParentAnalyticsAsync(Guid studentId, Guid? schoolId = null);
    Task<StaffAnalyticsDto>       GetStaffAnalyticsAsync(Guid? schoolId);
}
