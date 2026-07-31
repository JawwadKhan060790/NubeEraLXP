using Veriton.Application.DTOs;

namespace Veriton.Application.Interfaces.Services;

/// <summary>
/// Student Weakness Analysis — topic-level weakness tracking and grade-level analytics.
/// </summary>
public interface IStudentWeakTopicService
{
    /// <summary>Returns all weakness records for a student.</summary>
    Task<StudentWeaknessAnalysisDto> GetStudentWeaknessAsync(Guid studentId);

    /// <summary>Returns grade-level weakness analysis (filtered optionally by section/division).</summary>
    Task<GradeWeaknessAnalysisDto> GetGradeWeaknessAsync(Guid gradeId, Guid? sectionId = null);

    /// <summary>Teacher manually creates a weakness record.</summary>
    Task<Guid> CreateAsync(CreateStudentWeakTopicDto dto);

    /// <summary>Mark a weakness as resolved.</summary>
    Task ResolveAsync(Guid weakTopicId);

    /// <summary>
    /// Auto-sync weakness records from existing exam Results for a grade.
    /// Upserts StudentWeakTopic rows for students who scored below passing marks.
    /// </summary>
    Task SyncFromResultsAsync(Guid gradeId, Guid? schoolId);
}
