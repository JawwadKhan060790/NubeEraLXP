namespace Veriton.Application.DTOs;

public class StudentWeakTopicDto
{
    public Guid    Id                  { get; set; }
    public Guid    StudentId           { get; set; }
    public string  StudentName         { get; set; } = null!;
    public Guid    GradeId             { get; set; }
    public string  GradeName           { get; set; } = null!;
    public Guid    ModuleId            { get; set; }
    public string  ModuleName          { get; set; } = null!;
    public Guid    LessonId            { get; set; }
    public string  LessonName          { get; set; } = null!;
    public string  WeaknessLevel       { get; set; } = null!; // Low | Medium | High
    public string  Source              { get; set; } = null!;
    public decimal Score               { get; set; }
    public decimal MaxScore            { get; set; }
    public double  ScorePercent        => MaxScore == 0 ? 0 : Math.Round((double)(Score / MaxScore) * 100, 1);
    public int     Attempts            { get; set; }
    public DateTime LastAssessmentDate { get; set; }
    public string? RecommendedRevision { get; set; }
    public bool    IsResolved          { get; set; }
    public DateTime? ResolvedAt        { get; set; }
}

public class CreateStudentWeakTopicDto
{
    public Guid    StudentId           { get; set; }
    public Guid    GradeId             { get; set; }
    public Guid    ModuleId            { get; set; }
    public Guid    LessonId            { get; set; }
    public string  WeaknessLevel       { get; set; } = "Medium";
    public string  Source              { get; set; } = "Teacher";
    public decimal Score               { get; set; }
    public decimal MaxScore            { get; set; }
    public string? RecommendedRevision { get; set; }
}

public class StudentWeaknessAnalysisDto
{
    public Guid   StudentId     { get; set; }
    public string StudentName   { get; set; } = null!;
    public string GradeName     { get; set; } = null!;
    public int    TotalWeakTopics { get; set; }
    public int    HighWeakness  { get; set; }
    public int    MediumWeakness{ get; set; }
    public int    LowWeakness   { get; set; }
    public int    ResolvedCount { get; set; }
    public List<StudentWeakTopicDto> WeakTopics { get; set; } = new();
}

public class GradeWeaknessAnalysisDto
{
    public Guid   GradeId              { get; set; }
    public string GradeName            { get; set; } = null!;
    public int    TotalWeakInstances   { get; set; }
    public List<TopicWeaknessSummaryDto> TopWeakTopics { get; set; } = new();
    public List<StudentWeaknessAnalysisDto> Students   { get; set; } = new();
}

public class TopicWeaknessSummaryDto
{
    public Guid   LessonId         { get; set; }
    public string TopicName        { get; set; } = null!;
    public string ModuleName       { get; set; } = null!;
    public int    AffectedStudents { get; set; }
    public double AverageScore     { get; set; }
}

public class SyncWeakTopicsFromResultsDto
{
    public Guid GradeId { get; set; }
}
