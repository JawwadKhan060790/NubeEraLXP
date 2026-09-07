namespace NubeEra.Application.DTOs;

// ========================================
// SCHEDULER DTOs
// ========================================

public class SchedulerCreateDto
{
    public Guid  GradeId   { get; set; }
    public Guid? SectionId { get; set; }   // null = whole grade (backward compat)
    public Guid? ModuleId  { get; set; }
    public Guid? LessonId  { get; set; }
    public Guid  TeacherId { get; set; }
    public DateTime  Date      { get; set; }
    public TimeSpan  StartTime { get; set; }
    public TimeSpan  EndTime   { get; set; }
}

public class SchedulerUpdateDto
{
    public Guid  GradeId   { get; set; }
    public Guid? SectionId { get; set; }
    public Guid? ModuleId  { get; set; }
    public Guid? LessonId  { get; set; }
    public Guid  TeacherId { get; set; }
    public DateTime  Date      { get; set; }
    public TimeSpan  StartTime { get; set; }
    public TimeSpan  EndTime   { get; set; }
    public bool IsActive { get; set; }
}

public class SchedulerDto
{
    public Guid    Id             { get; set; }
    public Guid    SchoolId       { get; set; }
    public Guid    GradeId        { get; set; }
    public string  GradeName      { get; set; } = "";
    public Guid?   SectionId      { get; set; }
    public string? SectionCode    { get; set; }
    /// <summary>"Grade 1 - A" or just GradeName when no section.</summary>
    public string  GradeDisplay   => SectionCode != null ? $"{GradeName} - {SectionCode}" : GradeName;
    public Guid?   ModuleId       { get; set; }
    public string? ModuleName     { get; set; }
    public Guid?   LessonId       { get; set; }
    public string? LessonSubTopic { get; set; }
    public Guid    TeacherId      { get; set; }
    public string  TeacherName    { get; set; } = "";
    public DateTime  Date         { get; set; }
    public TimeSpan  StartTime    { get; set; }
    public TimeSpan  EndTime      { get; set; }
    public bool IsActive { get; set; }

    // Real-time period status & completion fields
    public string Status { get; set; } = "NotStarted";
    public DateTime? ActualStartTime { get; set; }
    public DateTime? ActualEndTime { get; set; }
    public string? Remarks { get; set; }
}
