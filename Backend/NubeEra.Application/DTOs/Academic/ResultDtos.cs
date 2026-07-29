namespace NubeEra.Application.DTOs;

public class ResultDto
{
    public Guid Id { get; set; }
    public Guid StudentId { get; set; }
    public string StudentName { get; set; } = "";
    public Guid ExamId { get; set; }
    public string ExamTitle { get; set; } = "";
    public decimal ObtainedMarks { get; set; }
    public decimal TotalMarks { get; set; }
    public string? Grade { get; set; }
    public string? Remarks { get; set; }
    public bool IsPublished { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ResultCreateDto
{
    public Guid StudentId { get; set; }
    public Guid ExamId { get; set; }
    public decimal ObtainedMarks { get; set; }
    public string? Grade { get; set; }
    public string? Remarks { get; set; }
    public bool IsPublished { get; set; }
}

public class ResultUpdateDto
{
    public decimal ObtainedMarks { get; set; }
    public string? Grade { get; set; }
    public string? Remarks { get; set; }
    public bool IsPublished { get; set; }
}

/// <summary>
/// Enriched result DTO used to pre-fill the Report Card generation form.
/// Joins Result → Exam → Module so the frontend gets subject name + max marks
/// without needing a separate Exam/Module lookup.
/// </summary>
public class ExamResultForReportCardDto
{
    public Guid ExamId { get; set; }
    public string ExamTitle { get; set; } = "";
    /// <summary>Module (subject) name — e.g. "Mathematics". Falls back to ExamTitle if no module.</summary>
    public string SubjectName { get; set; } = "";
    public decimal MaxMarks { get; set; }
    public decimal ObtainedMarks { get; set; }
    public string? Grade { get; set; }
    public string? Remarks { get; set; }
    public DateTime ExamDate { get; set; }
}
