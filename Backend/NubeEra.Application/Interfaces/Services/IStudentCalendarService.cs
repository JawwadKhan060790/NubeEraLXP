using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using NubeEra.Application.DTOs;

namespace NubeEra.Application.Interfaces.Services;

public interface IStudentCalendarService
{
    Task<List<StudentCalendarEventDto>> GetStudentCalendarAsync(Guid studentId, DateTime start, DateTime end);
}
