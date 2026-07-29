using NubeEra.Application.DTOs;

namespace NubeEra.Application.Interfaces.Services;

/// <summary>
/// Lets a Student rate/give feedback on the teachers who teach their grade,
/// from the Student Dashboard.
/// </summary>
public interface ITeacherRatingService
{
    /// <summary>Teachers the given Student can rate, annotated with their existing rating (if any).</summary>
    Task<List<RatableTeacherDto>> GetRatableTeachersAsync(Guid studentId);

    /// <summary>Create or update (upsert) the Student's rating for one Teacher.</summary>
    Task<TeacherRatingDto> SubmitRatingAsync(Guid studentId, SubmitTeacherRatingDto dto);
}
