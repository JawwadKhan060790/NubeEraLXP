using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Veriton.Application.DTOs;

namespace Veriton.Application.Interfaces.Services;

public interface IStudentPythonCodeService
{
    Task<StudentPythonCodeDto?> GetCodeAsync(Guid lessonId);
    Task SaveCodeAsync(StudentPythonCodeSaveDto dto);
    Task<StudentPythonCodeDto?> GetStudentCodeForTeacherAsync(Guid studentId, Guid lessonId);
    Task<IEnumerable<StudentPythonCodeDto>> GetSubmissionsForLessonAsync(Guid lessonId);
}
