using Veriton.Application.DTOs;

namespace Veriton.Application.Interfaces.Services;

/// <summary>
/// Exam management service contract.
/// </summary>
public interface IExamService : IGenericService<ExamCreateDto, ExamUpdateDto, ExamDto>
{
    /// <summary>Returns all exams for a specific grade.</summary>
    Task<List<ExamDto>> GetByGradeAsync(Guid gradeId);

    /// <summary>Returns all exams for a specific module.</summary>
    Task<List<ExamDto>> GetByModuleAsync(Guid moduleId);

    /// <summary>Returns exams visible to the current student.</summary>
    Task<List<ExamDto>> GetForStudentAsync(Guid studentId);
}
