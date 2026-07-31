using Veriton.Application.DTOs;

namespace Veriton.Application.Interfaces.Services;

public interface IStudentNoteService
{
    Task<StudentNoteDto?> GetNoteAsync(Guid lessonId);
    Task SaveNoteAsync(StudentNoteSaveDto dto);
}
