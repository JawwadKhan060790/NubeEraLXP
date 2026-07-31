using Veriton.Application.DTOs;

namespace Veriton.Application.Interfaces.Services;

/// <summary>
/// Teacher Learning Path — grade-wise syllabus progress and topic status tracking.
/// </summary>
public interface ITeacherLearningPathService
{
    /// <summary>Returns the grade-wise learning path for a teacher (all grades).</summary>
    Task<List<TeacherLearningPathDto>> GetLearningPathAsync(Guid teacherId);

    /// <summary>Returns the learning path for a teacher filtered to one specific grade and optionally section.</summary>
    Task<TeacherLearningPathDto> GetLearningPathByGradeAsync(Guid teacherId, Guid gradeId, Guid? sectionId);

    /// <summary>Update the status of one topic (lesson) for a teacher.</summary>
    Task UpdateTopicStatusAsync(Guid teacherId, UpdateTeacherTopicStatusDto dto);

    /// <summary>Returns the full syllabus completion summary with grade/subject/monthly breakdowns.</summary>
    Task<TeacherSyllabusCompletionDto> GetSyllabusCompletionAsync(Guid teacherId);

    /// <summary>Returns grade-wise student list with progress, attendance and weakness counts (filtered optionally by section/division).</summary>
    Task<TeacherGradeStudentListDto> GetGradeStudentListAsync(Guid teacherId, Guid gradeId, Guid? sectionId = null);

    /// <summary>Returns the enhanced teacher dashboard aggregates.</summary>
    Task<TeacherEnhancedDashboardDto> GetEnhancedDashboardAsync(Guid teacherId);
}
