namespace NubeEra.Application.DTOs;

// ── Teacher Learning Path ─────────────────────────────────────────────────────

/// <summary>Grade-wise Learning Path overview for a teacher.</summary>
public class TeacherLearningPathDto
{
    public Guid   GradeId          { get; set; }
    public string GradeName        { get; set; } = null!;
    public Guid?  SectionId        { get; set; }
    public string? SectionName     { get; set; }
    public int    TotalTopics      { get; set; }
    public int    CompletedTopics  { get; set; }
    public int    InProgressTopics { get; set; }
    public int    PendingTopics    { get; set; }
    public double CompletionPercentage { get; set; }
    public int    EstimatedRemainingTopics => PendingTopics + InProgressTopics;

    public List<TeacherModuleProgressDto> Modules { get; set; } = new();
}

public class TeacherModuleProgressDto
{
    public Guid   ModuleId         { get; set; }
    public string ModuleName       { get; set; } = null!;
    public int    TotalLessons     { get; set; }
    public int    CompletedLessons { get; set; }
    public double CompletionPercentage { get; set; }
    public int    ExpectedPeriods  { get; set; }
    public int    ExecutedPeriods  { get; set; }
    public double ExecutedHours    { get; set; }
    public List<TeacherTopicProgressDto> Topics { get; set; } = new();
}

public class TeacherTopicProgressDto
{
    public Guid    LessonId     { get; set; }
    public string  SubTopic     { get; set; } = null!;
    public int     SerialNumber { get; set; }
    public string  Status       { get; set; } = "NotStarted"; // NotStarted | InProgress | Completed
    public int     ExpectedPeriods{ get; set; }
    public int     ExecutedPeriods{ get; set; }
    public double  ExecutedHours   { get; set; }
    public DateTime? StartedAt  { get; set; }
    public DateTime? CompletedAt{ get; set; }
    public string? Remarks      { get; set; }
    public bool   IsActivity    { get; set; }
}

// ── Update Topic Status ───────────────────────────────────────────────────────

public class UpdateTeacherTopicStatusDto
{
    public Guid   LessonId  { get; set; }
    public Guid   GradeId   { get; set; }
    public Guid   ModuleId  { get; set; }
    public Guid?  SectionId { get; set; }
    public string Status    { get; set; } = null!; // NotStarted | InProgress | Completed
    public string? Remarks  { get; set; }
}

// ── Syllabus Completion Summary ───────────────────────────────────────────────

public class TeacherSyllabusCompletionDto
{
    public double OverallCompletionPercentage { get; set; }
    public List<GradeSyllabusDto>   GradeBreakdown   { get; set; } = new();
    public List<SubjectSyllabusDto> SubjectBreakdown { get; set; } = new();
    public List<MonthlySyllabusDto> MonthlyBreakdown { get; set; } = new();
    public int CompletedTopics  { get; set; }
    public int RemainingTopics  { get; set; }
    public int DelayedTopics    { get; set; }  // Completed but past expected date
    public int OverdueTopics    { get; set; }  // Not completed, past expected date
}

public class GradeSyllabusDto
{
    public Guid   GradeId              { get; set; }
    public Guid?  SectionId            { get; set; }
    public string GradeName            { get; set; } = null!;
    public int    TotalTopics          { get; set; }
    public int    CompletedTopics      { get; set; }
    public double CompletionPercentage { get; set; }
}

public class SubjectSyllabusDto
{
    public Guid   ModuleId             { get; set; }
    public string ModuleName           { get; set; } = null!;
    public string GradeName            { get; set; } = null!;
    public int    TotalTopics          { get; set; }
    public int    CompletedTopics      { get; set; }
    public double CompletionPercentage { get; set; }
}

public class MonthlySyllabusDto
{
    public int    Month                { get; set; }
    public int    Year                 { get; set; }
    public string MonthName            { get; set; } = null!;
    public int    CompletedTopics      { get; set; }
    public double CompletionPercentage { get; set; }
}

// ── Grade-wise Student List ───────────────────────────────────────────────────

public class TeacherGradeStudentListDto
{
    public Guid   GradeId                 { get; set; }
    public string GradeName               { get; set; } = null!;
    public double GradeCompletionPercent  { get; set; }
    public double AverageAttendancePercent{ get; set; }
    public int    TotalPeriodsPlanned     { get; set; }
    public int    TotalPeriodsConducted   { get; set; }
    public double PeriodsCompletionPercent{ get; set; }
    public int    CompletedStudents       { get; set; }
    public int    InProgressStudents      { get; set; }
    public int    BehindScheduleStudents  { get; set; }
    public List<TeacherStudentRowDto> Students { get; set; } = new();
}

public class TeacherStudentRowDto
{
    public Guid    StudentId              { get; set; }
    public string  StudentName            { get; set; } = null!;
    public string? RollNo                 { get; set; }
    public string  GradeName              { get; set; } = null!;
    public double  AttendancePercent      { get; set; }
    public double  CourseCompletionPercent{ get; set; }
    public int     WeakTopicsCount        { get; set; }
    public DateTime? LastActivityDate     { get; set; }
    public string? CurrentModuleName      { get; set; }
    public string? CurrentTopicName       { get; set; }
    public string  LearningVelocity       { get; set; } = "Average"; // Fast | Average | NeedsAttention
}

// ── Enhanced Teacher Dashboard ────────────────────────────────────────────────

public class TeacherEnhancedDashboardDto
{
    // Today's schedule
    public int TodayTotalPeriods     { get; set; }
    public int TodayCompletedPeriods { get; set; }
    public int TodayPendingPeriods   { get; set; }
    public int TodayMissedPeriods    { get; set; }

    // Students
    public int TotalStudentsAssigned { get; set; }
    public int WeakStudentsCount     { get; set; }

    // Syllabus
    public double OverallSyllabusCompletion { get; set; }
    public int    WeakTopicsCount           { get; set; }

    // Attendance
    public double AttendanceSummaryPercent  { get; set; }

    // Grade progress cards
    public List<GradeProgressDto>       GradeProgressList   { get; set; } = new();
    public List<TeacherPeriodSummaryDto> UpcomingPeriods     { get; set; } = new();
    public List<TeacherPeriodSummaryDto> TodaySchedule       { get; set; } = new();
}

public class TeacherPeriodSummaryDto
{
    public Guid      SchedulePeriodId { get; set; }
    public Guid      SchedulerId      { get; set; }
    public Guid      GradeId          { get; set; }
    public string    GradeName        { get; set; } = null!;
    public string?   ModuleName       { get; set; }
    public string?   LessonName       { get; set; }
    public DateTime  PeriodDate       { get; set; }
    public TimeSpan  StartTime        { get; set; }
    public TimeSpan  EndTime          { get; set; }
    public string    Status           { get; set; } = "NotStarted";
    public string?   Remarks          { get; set; }
}
