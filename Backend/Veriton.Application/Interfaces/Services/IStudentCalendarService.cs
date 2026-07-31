using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Veriton.Application.DTOs;

namespace Veriton.Application.Interfaces.Services;

public interface IStudentCalendarService
{
    Task<List<StudentCalendarEventDto>> GetStudentCalendarAsync(Guid studentId, DateTime start, DateTime end);
}
