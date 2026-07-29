namespace NubeEra.Application.DTOs;

public class TeacherSchedulePeriodDto
{
    public Guid      Id              { get; set; }
    public Guid      SchedulerId     { get; set; }
    public Guid      GradeId         { get; set; }
    public string    GradeName       { get; set; } = null!;
    public Guid?     SectionId       { get; set; }
    public string?   SectionName     { get; set; }
    public Guid?     ModuleId        { get; set; }
    public string?   ModuleName      { get; set; }
    public Guid?     LessonId        { get; set; }
    public string?   LessonName      { get; set; }
    public DateTime  PeriodDate      { get; set; }
    public TimeSpan  StartTime       { get; set; }
    public TimeSpan  EndTime         { get; set; }
    public string    Status          { get; set; } = "NotStarted";
    public DateTime? ActualStartTime { get; set; }
    public DateTime? ActualEndTime   { get; set; }
    public string?   Remarks         { get; set; }
}

public class UpdatePeriodStatusDto
{
    public string    Status          { get; set; } = null!;
    public string?   Remarks         { get; set; }
    public DateTime? ActualStartTime { get; set; }
    public DateTime? ActualEndTime   { get; set; }
}

public class TeacherDailyScheduleDto
{
    public DateTime   Date     { get; set; }
    public string     DayName  { get; set; } = null!;
    public int        Total    { get; set; }
    public int        Completed{ get; set; }
    public int        Pending  { get; set; }
    public int        Missed   { get; set; }
    public List<TeacherSchedulePeriodDto> Periods { get; set; } = new();
}

public class TeacherWeeklyScheduleDto
{
    public DateTime WeekStart { get; set; }
    public DateTime WeekEnd   { get; set; }
    public List<TeacherDailyScheduleDto> Days { get; set; } = new();
}

public class TeacherCalendarEventDto
{
    public Guid     PeriodId   { get; set; }
    public Guid     SchedulerId{ get; set; }
    public string   Title      { get; set; } = null!;  // "Grade 3 - Python Basics"
    public DateTime Start      { get; set; }
    public DateTime End        { get; set; }
    public string   Status     { get; set; } = "NotStarted";
    public string   Color      { get; set; } = "#3B82F6"; // blue=NotStarted, orange=InProgress, green=Completed, red=Missed
    public string?  GradeName  { get; set; }
    public string?  ModuleName { get; set; }
    public string?  LessonName { get; set; }
    public Guid?    SectionId  { get; set; }
    public string?  SectionName{ get; set; }
}
