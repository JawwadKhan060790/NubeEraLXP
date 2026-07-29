namespace NubeEra.Application.DTOs;

public class StudentNoteDto
{
    public Guid LessonId { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime LastUpdated { get; set; }
}

public class StudentNoteSaveDto
{
    public Guid LessonId { get; set; }
    public string Content { get; set; } = string.Empty;
}
