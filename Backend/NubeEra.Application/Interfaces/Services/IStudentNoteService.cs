using NubeEra.Application.DTOs;

namespace NubeEra.Application.Interfaces.Services;

public interface IStudentNoteService
{
    Task<StudentNoteDto?> GetNoteAsync(Guid lessonId);
    Task SaveNoteAsync(StudentNoteSaveDto dto);
}
