using Veriton.Application.DTOs;

namespace Veriton.Application.Interfaces.Services;

/// <summary>
/// Manages Grade Sections (A, B, C …) within the School → Grade → Section hierarchy.
/// </summary>
public interface IGradeSectionService
{
    /// <summary>All sections visible to the current user.</summary>
    Task<List<GradeSectionDto>> GetAllAsync();

    /// <summary>Sections for a specific grade.</summary>
    Task<List<GradeSectionDto>> GetByGradeAsync(Guid gradeId);

    /// <summary>Sections for a school, optionally filtered by grade.</summary>
    Task<List<GradeSectionDto>> GetBySchoolAsync(Guid schoolId, Guid? gradeId = null);

    Task<GradeSectionDto?> GetByIdAsync(Guid id);

    Task<Guid> CreateAsync(GradeSectionCreateDto dto);

    Task UpdateAsync(Guid id, GradeSectionUpdateDto dto);

    /// <summary>Soft-delete a section.</summary>
    Task DeleteAsync(Guid id);
}
