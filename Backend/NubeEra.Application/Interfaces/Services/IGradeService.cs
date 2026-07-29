using NubeEra.Application.DTOs;

namespace NubeEra.Application.Interfaces.Services;

/// <summary>
/// Grade (classroom) management service contract.
/// </summary>
public interface IGradeService : IGenericService<GradeCreateDto, GradeUpdateDto, GradeDto>
{
    /// <summary>Returns all grades belonging to a specific school.</summary>
    Task<List<GradeDto>> GetBySchoolAsync(Guid schoolId);

    /// <summary>Returns grades accessible to the current user based on role and school context.</summary>
    Task<List<GradeDto>> GetAccessibleAsync();
}
