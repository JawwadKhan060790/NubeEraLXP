using NubeEra.Application.DTOs;

namespace NubeEra.Application.Interfaces.Services;

/// <summary>
/// Class schedule service contract.
/// </summary>
public interface ISchedulerService : IGenericService<SchedulerCreateDto, SchedulerUpdateDto, SchedulerDto>
{
    /// <summary>Returns the weekly schedule for a specific grade.</summary>
    Task<List<SchedulerDto>> GetByGradeAsync(Guid gradeId);

    /// <summary>Returns the schedule for a specific teacher.</summary>
    Task<List<SchedulerDto>> GetByTeacherAsync(Guid teacherId);
}
