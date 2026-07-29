using System.Security.Claims;

namespace NubeEra.Application.Interfaces.Security;

public interface ICurrentUserService
{
    string? UserId { get; }
    string? Role { get; }
    Guid? SchoolId { get; }
    Guid? TeacherId { get; }
    Guid? StudentId { get; }
    Guid? GradeId { get; }
    /// <summary>School-agnostic master grade level for the current student (resolved from their per-school Grade.GradeLevelId at login). Null for non-student users or legacy Grade rows not yet backfilled with a GradeLevelId.</summary>
    Guid? GradeLevelId { get; }
    bool IsAuthenticated { get; }
    ClaimsPrincipal User { get; }
}
