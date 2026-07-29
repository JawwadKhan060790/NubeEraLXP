using NubeEra.Application.DTOs;

namespace NubeEra.Application.Interfaces.Services;

/// <summary>
/// Exam result service contract.
/// </summary>
public interface IResultService : IGenericService<ResultCreateDto, ResultUpdateDto, ResultDto>
{
    /// <summary>Returns all results for a specific exam.</summary>
    Task<List<ResultDto>> GetByExamAsync(Guid examId);

    /// <summary>Returns all results for a specific student.</summary>
    Task<List<ResultDto>> GetByStudentAsync(Guid studentId);
}
