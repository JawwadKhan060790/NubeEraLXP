namespace NubeEra.Application.DTOs.Dashboard;

// ── Primitives ────────────────────────────────────────────────────────────────

/// <summary>A single labeled data point used by bar/pie charts.</summary>
public record ChartPoint(string Label, double Value);

/// <summary>A time-series point used by line/area charts.</summary>
public record TrendPoint(string Month, double Value);

/// <summary>A two-series trend point (e.g. students vs teachers).</summary>
public record DualTrendPoint(string Month, double Primary, double Secondary);

// ── SuperAdmin Analytics ──────────────────────────────────────────────────────

public class SuperAdminAnalyticsDto
{
    // KPI Cards
    public int TotalSchools        { get; set; }
    public int TotalStudents       { get; set; }
    public int TotalTeachers       { get; set; }
    public int TotalParents        { get; set; }
    public int TotalStaff          { get; set; }
    public int ActiveUsersToday    { get; set; }
    public int NewRegistrations30d { get; set; }
    public int TotalExams          { get; set; }

    // School Growth — monthly new schools (last 12 months)
    public List<TrendPoint> SchoolGrowthTrend     { get; set; } = new();

    // Student Growth — monthly new students (last 12 months)
    public List<TrendPoint> StudentGrowthTrend    { get; set; } = new();

    // User Distribution — pie breakdown by role
    public List<ChartPoint> UserDistribution      { get; set; } = new();

    // Top 10 Schools by enrollment
    public List<ChartPoint> TopSchoolsByEnrollment { get; set; } = new();

    // Platform activity — monthly attendance records + exams conducted
    public List<DualTrendPoint> PlatformActivity  { get; set; } = new();

    // Exam performance — avg score per month
    public List<TrendPoint> ExamPerformanceTrend  { get; set; } = new();
}

// ── Admin Analytics ───────────────────────────────────────────────────────────

public class AdminAnalyticsDto
{
    // KPI Cards
    public int TotalStudents      { get; set; }
    public int TotalTeachers      { get; set; }
    public int TotalGrades        { get; set; }
    public int TotalSchools       { get; set; }
    public int TotalExams         { get; set; }
    public int PendingStudents    { get; set; }
    public int PendingTeachers    { get; set; }
    public int TotalEvents        { get; set; }

    // Student admissions trend — monthly (last 12 months)
    public List<TrendPoint> StudentAdmissionsTrend    { get; set; } = new();

    // Teacher recruitment trend — monthly (last 12 months)
    public List<TrendPoint> TeacherRecruitmentTrend   { get; set; } = new();

    // Attendance summary — attendance rate per school (grade-level detail belongs on the Principal dashboard)
    public List<ChartPoint> AttendanceSummaryBySchool { get; set; } = new();

    // Academic performance distribution — grade-letter distribution
    public List<ChartPoint> AcademicPerformanceDist   { get; set; } = new();

    // Events participation trend — monthly registrations
    public List<TrendPoint> EventParticipationTrend   { get; set; } = new();

    // School performance comparison — avg exam score per school
    public List<ChartPoint> SchoolPerformanceComp     { get; set; } = new();

    // Exam results trend — avg monthly score
    public List<TrendPoint> ExamResultsTrend          { get; set; } = new();

    // Extra charts requested: syllabus completion & subjectwise data
    public List<ChartPoint> SyllabusCompletionByGrade { get; set; } = new();
    public List<ChartPoint> SubjectwisePerformance    { get; set; } = new();
}

// ── Principal Analytics ───────────────────────────────────────────────────────

public class PrincipalAnalyticsDto
{
    // KPI Cards
    public int TotalStudents       { get; set; }
    public int TotalTeachers       { get; set; }
    public int TotalGrades         { get; set; }
    public int TotalExams          { get; set; }
    public int TotalModules        { get; set; }
    public double AvgAttendanceRate { get; set; }
    public double AvgExamScore     { get; set; }
    public int TotalEvents         { get; set; }

    // Student enrollment trend — monthly (last 12 months)
    public List<TrendPoint> EnrollmentTrend       { get; set; } = new();

    // Class-wise attendance — avg attendance % per grade
    public List<ChartPoint> ClassAttendance       { get; set; } = new();

    // Exam results trend — avg score per month
    public List<TrendPoint> ExamResultsTrend      { get; set; } = new();

    // Subject/module performance — avg exam score per module
    public List<ChartPoint> SubjectPerformance    { get; set; } = new();

    // Teacher performance — avg student score per teacher's modules
    public List<ChartPoint> TeacherPerformance    { get; set; } = new();

    // Grade exam pass/fail distribution
    public List<ChartPoint> PassFailDistribution  { get; set; } = new();

    // Academic growth trend — avg score per month dual (this vs last year)
    public List<DualTrendPoint> AcademicGrowth    { get; set; } = new();
}

// ── Teacher Analytics ─────────────────────────────────────────────────────────

public class TeacherAnalyticsDto
{
    // KPI Cards
    public int TotalStudents        { get; set; }
    public int TotalModules         { get; set; }
    public int TotalLessons         { get; set; }
    public int TotalExams           { get; set; }
    public double AvgAttendanceRate { get; set; }
    public double AvgExamScore      { get; set; }
    public int WeakStudentsCount    { get; set; }
    public double SyllabusCompletion { get; set; }

    // Class attendance trend — monthly avg (last 12 months)
    public List<TrendPoint> AttendanceTrend         { get; set; } = new();

    // Student performance trend — monthly avg exam score
    public List<TrendPoint> PerformanceTrend        { get; set; } = new();

    // Marks distribution — score bands (0-40, 41-60, 61-80, 81-100)
    public List<ChartPoint> MarksDistribution       { get; set; } = new();

    // Weak students — bottom 10 by avg score
    public List<ChartPoint> WeakStudentsAnalysis    { get; set; } = new();

    // Assignment submission status — submitted vs pending vs missing
    public List<ChartPoint> AssignmentStatus        { get; set; } = new();

    // Topic/syllabus completion — per module
    public List<ChartPoint> SyllabusProgress        { get; set; } = new();

    // Exam performance trend — avg score per exam (chronological)
    public List<TrendPoint> ExamPerformanceTrend    { get; set; } = new();
}

// ── Student Analytics ─────────────────────────────────────────────────────────

public class StudentAnalyticsDto
{
    // KPI Cards
    public int    TotalModules          { get; set; }
    public int    TotalLessons          { get; set; }
    public int    CompletedLessons      { get; set; }
    public int    TotalExams            { get; set; }
    public double AverageScore          { get; set; }
    public double AttendanceRate        { get; set; }
    public double SyllabusCompletion    { get; set; }
    public int    ExamsPassed           { get; set; }
    public int    ExamsFailed           { get; set; }

    // Academic performance trend — exam scores over time
    public List<TrendPoint> PerformanceTrend      { get; set; } = new();

    // Subject performance comparison — avg score per module/subject
    public List<ChartPoint> SubjectPerformance    { get; set; } = new();

    // Attendance trend — monthly attendance % (last 6 months)
    public List<TrendPoint> AttendanceTrend       { get; set; } = new();

    // Learning progress — per-module completion %
    public List<ChartPoint> LearningProgress      { get; set; } = new();

    // Exam result trend — score per exam chronologically
    public List<TrendPoint> ExamResultTrend       { get; set; } = new();

    // Pass / Fail distribution pie
    public List<ChartPoint> PassFailPie           { get; set; } = new();

    // Monthly achievement growth — lessons completed per month
    public List<TrendPoint> AchievementGrowth     { get; set; } = new();
}

// ── Parent Analytics ──────────────────────────────────────────────────────────

public class ParentAnalyticsDto
{
    // KPI Cards (per selected child)
    public string ChildName           { get; set; } = "";
    public string GradeName           { get; set; } = "";
    public double AttendanceRate      { get; set; }
    public double AverageScore        { get; set; }
    public double SyllabusCompletion  { get; set; }
    public int    ExamsPassed         { get; set; }
    public int    ExamsFailed         { get; set; }
    public int    TotalExams          { get; set; }

    // Child academic growth — monthly avg score
    public List<TrendPoint> AcademicGrowth        { get; set; } = new();

    // Attendance monitoring — monthly attendance %
    public List<TrendPoint> AttendanceTrend       { get; set; } = new();

    // Subject-wise performance bar chart
    public List<ChartPoint> SubjectPerformance    { get; set; } = new();

    // Exam result comparison — score vs passing mark per exam
    public List<DualTrendPoint> ExamComparison    { get; set; } = new();

    // Pass/Fail distribution pie
    public List<ChartPoint> PassFailPie           { get; set; } = new();

    // Learning progress — per module
    public List<ChartPoint> LearningProgress      { get; set; } = new();
}

// ── Staff Analytics ───────────────────────────────────────────────────────────

public class StaffAnalyticsDto
{
    // KPI Cards
    public int TotalStudents         { get; set; }
    public int TotalTeachers         { get; set; }
    public int TotalOpenTickets      { get; set; }
    public int TotalCertificates     { get; set; }
    public int TotalReportCards      { get; set; }
    public int TotalEvents           { get; set; }
    public int ResolvedTickets       { get; set; }
    public int NewStudentsThisMonth  { get; set; }
    public int TotalDoubts           { get; set; }
    public int TotalUnits            { get; set; }

    // Ticket trend — monthly new tickets (last 6 months)
    public List<TrendPoint> TicketTrend              { get; set; } = new();

    // Student admissions trend — monthly new students
    public List<TrendPoint> AdmissionsTrend          { get; set; } = new();

    // Certificates issued — monthly count
    public List<TrendPoint> CertificatesTrend        { get; set; } = new();

    // Report cards generated — monthly count
    public List<TrendPoint> ReportCardsTrend         { get; set; } = new();

    // Ticket status distribution — Open/InProgress/Resolved/Closed
    public List<ChartPoint> TicketStatusDist         { get; set; } = new();

    // Event participation — registrations per event (top 8)
    public List<ChartPoint> EventParticipation       { get; set; } = new();

    // Daily operations summary — tickets + certs + reports per month
    public List<DualTrendPoint> OperationsSummary    { get; set; } = new();

    // Extra charts requested: syllabus completion & subjectwise data
    public List<ChartPoint> SyllabusCompletionByGrade { get; set; } = new();
    public List<ChartPoint> SubjectwisePerformance    { get; set; } = new();
}
