using NubeEra.Application.DTOs.Academic;

namespace NubeEra.Application.Interfaces.Services;

public interface IStudentDoubtService
{
    /// <summary>Student raises a new doubt (with optional topic and screenshot).</summary>
    Task<StudentDoubtDto> RaiseDoubtAsync(StudentDoubtCreateDto dto);

    /// <summary>Returns the logged-in student's own doubts.</summary>
    Task<List<StudentDoubtListItemDto>> GetMyDoubtsAsync();

    /// <summary>Returns the full detail of a single doubt (student owner or teacher of that grade).</summary>
    Task<StudentDoubtDto?> GetDoubtByIdAsync(Guid id);

    /// <summary>Returns all open/answered doubts for the logged-in teacher's grade students.</summary>
    Task<List<StudentDoubtListItemDto>> GetGradeDoubtsAsync();

    /// <summary>Staff/Admin: paginated list with optional filters.</summary>
    Task<(List<StudentDoubtListItemDto> Items, int TotalCount)> GetAllDoubtsAsync(StudentDoubtFilterDto filters);

    /// <summary>Teacher records a reply and sets status to Answered.</summary>
    Task ReplyAsync(Guid doubtId, StudentDoubtReplyDto dto);

    /// <summary>Teacher/Staff/Admin closes the doubt.</summary>
    Task CloseAsync(Guid doubtId);

    /// <summary>Student deletes their own doubt (only if still Open).</summary>
    Task DeleteAsync(Guid doubtId);

    /// <summary>Returns lessons scoped to the logged-in student's grade for the topic dropdown.</summary>
    Task<List<LessonDropdownDto>> GetLessonsForStudentGradeAsync();
}

public class LessonDropdownDto
{
    public Guid   Id         { get; set; }
    public string SubTopic   { get; set; } = null!;
    public Guid   ModuleId   { get; set; }
    public string ModuleName { get; set; } = null!;
}
