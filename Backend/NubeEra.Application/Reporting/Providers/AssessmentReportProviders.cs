using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using NubeEra.Application.Common.Reporting;
using NubeEra.Application.Interfaces.Repositories;
using NubeEra.Application.Interfaces.Security;
using NubeEra.Application.Interfaces.Services.Reporting;
using NubeEra.Domain.Entities;

namespace NubeEra.Application.Reporting.Providers;

/// <summary>"Assessment Reports" — published-result analysis across exams (grade distribution, pass rates, score trends). Complements <see cref="StudentPerformanceReportProvider"/>'s per-student ledger with an exam-centric rollup.</summary>
public class AssessmentResultsReportProvider : IReportDataProvider
{
    private readonly IGenericRepository<Result> _resultRepo;
    private readonly ICurrentUserService _currentUserService;

    public AssessmentResultsReportProvider(IGenericRepository<Result> resultRepo, ICurrentUserService currentUserService)
    {
        _resultRepo = resultRepo;
        _currentUserService = currentUserService;
    }

    public string Key => "assessment-results";
    public string Category => "Assessment Reports";
    public string Title => "Assessment Results Report";
    public string Description => "Per-exam roll-up of published results: participants, average score, pass rate, and grade distribution.";
    public IReadOnlyList<string> AllowedRoles { get; } = new[] { "principal", "staff", "teacher" };

    public IReadOnlyList<ReportColumnDefinition> Columns { get; } = new List<ReportColumnDefinition>
    {
        ReportColumnDefinition.Text("exam_title", "Exam", 220),
        ReportColumnDefinition.Text("module_name", "Course / Subject", 180),
        ReportColumnDefinition.Text("grade_name", "Grade", 110),
        ReportColumnDefinition.Date("exam_date", "Date", 120),
        ReportColumnDefinition.Number("participants", "Participants", 110),
        ReportColumnDefinition.Number("average_marks", "Average Marks", 130, "0.0"),
        ReportColumnDefinition.Percent("pass_rate", "Pass %", 100),
    };

    public async Task<ReportDataResult> GetDataAsync(ReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        var (start, end) = filter.ResolveDateRange();

        var results = await _resultRepo.GetAllAsync(q =>
        {
            IQueryable<Result> query = q.Where(r => r.IsPublished);
            if (filter.SchoolId.HasValue) query = query.Where(r => r.SchoolId == filter.SchoolId.Value);
            return query.Include(r => r.Exam).ThenInclude(e => e.Module).Include(r => r.Exam).ThenInclude(e => e.Grade);
        });

        if (filter.GradeId.HasValue) results = results.Where(r => r.Exam?.GradeId == filter.GradeId.Value).ToList();
        var courseId = filter.CourseId ?? filter.SubjectId;
        if (courseId.HasValue) results = results.Where(r => r.Exam?.ModuleId == courseId.Value).ToList();
        if (start.HasValue) results = results.Where(r => r.Exam != null && r.Exam.Date >= start.Value).ToList();
        if (end.HasValue) results = results.Where(r => r.Exam != null && r.Exam.Date <= end.Value).ToList();

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim();
            results = results.Where(r => ReportProviderHelpers.ContainsIgnoreCase(r.Exam?.Title, term) || ReportProviderHelpers.ContainsIgnoreCase(r.Exam?.Module?.Name, term)).ToList();
        }

        bool Passed(Result r) => r.Exam?.PassingMarks is null || r.ObtainedMarks >= r.Exam.PassingMarks.Value;

        var grouped = results
            .Where(r => r.Exam != null)
            .GroupBy(r => r.ExamId)
            .Select(g => new
            {
                Exam = g.First().Exam!,
                Participants = g.Count(),
                Average = Math.Round(g.Average(r => r.ObtainedMarks), 1),
                PassRate = ReportProviderHelpers.SafePercentage(g.Count(Passed), g.Count()),
            })
            .ToList();

        var ordered = (filter.SortBy?.ToLowerInvariant()) switch
        {
            "average_marks" => grouped.OrderBy(x => x.Average).ToList(),
            "pass_rate" => grouped.OrderBy(x => x.PassRate).ToList(),
            "exam_date" => grouped.OrderBy(x => x.Exam.Date).ToList(),
            _ => grouped.OrderByDescending(x => x.Exam.Date).ToList(),
        };
        if (string.Equals(filter.SortDirection, "desc", StringComparison.OrdinalIgnoreCase) && filter.SortBy is not null)
        {
            ordered.Reverse();
        }

        var totalCount = ordered.Count;
        var page = filter.Page < 1 ? 1 : filter.Page;
        var pageSize = filter.PageSize <= 0 ? 25 : filter.PageSize;
        var pageItems = ordered.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        var rows = pageItems.Select(x => new Dictionary<string, object?>
        {
            ["exam_title"] = x.Exam.Title ?? "Exam",
            ["module_name"] = x.Exam.Module?.Name,
            ["grade_name"] = x.Exam.Grade?.GradeName,
            ["exam_date"] = x.Exam.Date,
            ["participants"] = x.Participants,
            ["average_marks"] = x.Average,
            ["pass_rate"] = x.PassRate,
        }).ToList();

        var overallPass = ReportProviderHelpers.SafePercentage(results.Count(Passed), results.Count);
        var topExams = grouped.OrderByDescending(x => x.Average).Take(8).ToList();

        return new ReportDataResult
        {
            Rows = rows,
            TotalCount = totalCount,
            Kpis = new List<ReportKpiDto>
            {
                ReportKpiDto.Number("exams_assessed", "Exams Assessed", grouped.Count, "FileCheck"),
                ReportKpiDto.Number("results_published", "Results Published", results.Count, "FileText"),
                ReportKpiDto.Percent("overall_pass_rate", "Overall Pass %", overallPass, "Award"),
            },
            Charts = new List<ReportChartDto>
            {
                ReportChartDto.Single("avg_marks_by_exam", "Average Marks by Exam", ReportChartType.Bar,
                    topExams.Select(x => x.Exam.Title ?? "Exam"), "Average Marks", topExams.Select(x => x.Average), "Marks")
            },
            SummaryNote = $"{rows.Count} of {totalCount} exams shown — {overallPass}% overall pass rate."
        };
    }
}

/// <summary>"Examination Reports" — the upcoming/past exam schedule (date, course, grade, duration, marks) — distinct from <see cref="AssessmentResultsReportProvider"/>'s outcome analysis; this is the planning/calendar view.</summary>
public class ExaminationScheduleReportProvider : IReportDataProvider
{
    private readonly IGenericRepository<Exam> _examRepo;
    private readonly ICurrentUserService _currentUserService;

    public ExaminationScheduleReportProvider(IGenericRepository<Exam> examRepo, ICurrentUserService currentUserService)
    {
        _examRepo = examRepo;
        _currentUserService = currentUserService;
    }

    public string Key => "examination-schedule";
    public string Category => "Examination Reports";
    public string Title => "Examination Schedule Report";
    public string Description => "Planned and past examinations with date, course, grade, duration, total/passing marks, and authoring teacher.";
    public IReadOnlyList<string> AllowedRoles { get; } = new[] { "principal", "staff", "teacher", "student", "parent" };

    public IReadOnlyList<ReportColumnDefinition> Columns { get; } = new List<ReportColumnDefinition>
    {
        ReportColumnDefinition.Text("title", "Exam", 220),
        ReportColumnDefinition.Date("date", "Date", 120),
        ReportColumnDefinition.Text("module_name", "Course / Subject", 180),
        ReportColumnDefinition.Text("grade_name", "Grade", 110),
        ReportColumnDefinition.Number("duration_minutes", "Duration (min)", 130),
        ReportColumnDefinition.Number("total_marks", "Total Marks", 110),
        ReportColumnDefinition.Number("passing_marks", "Passing Marks", 120),
        ReportColumnDefinition.Text("teacher_name", "Set By", 170),
        ReportColumnDefinition.Text("status", "Status", 100),
    };

    public async Task<ReportDataResult> GetDataAsync(ReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        var (start, end) = filter.ResolveDateRange();

        var exams = await _examRepo.GetAllAsync(q =>
        {
            IQueryable<Exam> query = q.Where(e => e.IsActive);
            if (filter.SchoolId.HasValue) query = query.Where(e => e.SchoolId == filter.SchoolId.Value);
            if (filter.GradeId.HasValue) query = query.Where(e => e.GradeId == filter.GradeId.Value);
            var courseId = filter.CourseId ?? filter.SubjectId;
            if (courseId.HasValue) query = query.Where(e => e.ModuleId == courseId.Value);
            if (filter.TeacherId.HasValue) query = query.Where(e => e.CreatedByTeacherId == filter.TeacherId.Value);
            if (start.HasValue) query = query.Where(e => e.Date >= start.Value);
            if (end.HasValue) query = query.Where(e => e.Date <= end.Value);

            return query.Include(e => e.Module).Include(e => e.Grade).Include(e => e.CreatedByTeacher);
        });

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim();
            exams = exams.Where(e => ReportProviderHelpers.ContainsIgnoreCase(e.Title, term) || ReportProviderHelpers.ContainsIgnoreCase(e.Module?.Name, term)).ToList();
        }

        var keySelectors = new Dictionary<string, Func<Exam, IComparable?>>(StringComparer.OrdinalIgnoreCase)
        {
            ["title"] = e => e.Title,
            ["date"] = e => e.Date,
            ["total_marks"] = e => e.TotalMarks,
        };

        var page = ReportProviderHelpers.SortAndPage(exams, filter, keySelectors, "date", out var totalCount);

        var today = DateTime.UtcNow.Date;
        var rows = page.Select(e => new Dictionary<string, object?>
        {
            ["title"] = e.Title ?? "Exam",
            ["date"] = e.Date,
            ["module_name"] = e.Module?.Name,
            ["grade_name"] = e.Grade?.GradeName,
            ["duration_minutes"] = e.DurationMinutes,
            ["total_marks"] = e.TotalMarks,
            ["passing_marks"] = e.PassingMarks,
            ["teacher_name"] = e.CreatedByTeacher == null ? "Staff" : ReportProviderHelpers.FullName(e.CreatedByTeacher.FirstName, e.CreatedByTeacher.LastName),
            ["status"] = e.Date.Date < today ? "Completed" : (e.Date.Date == today ? "Today" : "Scheduled"),
        }).ToList();

        var upcoming = exams.Count(e => e.Date.Date >= today);
        var byMonth = exams
            .GroupBy(e => new DateTime(e.Date.Year, e.Date.Month, 1))
            .OrderBy(g => g.Key)
            .TakeLast(6)
            .ToList();

        return new ReportDataResult
        {
            Rows = rows,
            TotalCount = totalCount,
            Kpis = new List<ReportKpiDto>
            {
                ReportKpiDto.Number("total_exams", "Total Exams", exams.Count, "FileText"),
                ReportKpiDto.Number("upcoming_exams", "Upcoming Exams", upcoming, "CalendarClock"),
                ReportKpiDto.Number("completed_exams", "Completed Exams", exams.Count - upcoming, "CheckCircle"),
            },
            Charts = new List<ReportChartDto>
            {
                ReportChartDto.Single("exams_by_month", "Exams Scheduled by Month", ReportChartType.Bar,
                    byMonth.Select(g => g.Key.ToString("MMM yyyy")), "Exams", byMonth.Select(g => (decimal)g.Count()), "Exams")
            },
            SummaryNote = $"{rows.Count} of {totalCount} examinations shown — {upcoming} upcoming."
        };
    }
}

/// <summary>
/// "Certificate Reports" — this schema has NO dedicated Certificate entity, so
/// rather than fabricate certificate records, this report honestly derives
/// CERTIFICATE ELIGIBILITY from the same real signals a certificate would be
/// awarded on: course completion (<see cref="LessonCompletion"/> vs. the
/// course's lesson count) and exam pass status (<see cref="Result"/>). The
/// "real database data only" requirement is honoured — every figure traces to
/// an actual row — while the gap is named plainly (see <c>REPORTING_MODULE.md</c>
/// "Known Data-Model Gaps" for the documented follow-up: a first-class
/// Certificate entity + issuance workflow).
/// </summary>
public class CertificateEligibilityReportProvider : IReportDataProvider
{
    private readonly IGenericRepository<Student> _studentRepo;
    private readonly IGenericRepository<LessonCompletion> _completionRepo;
    private readonly IGenericRepository<Result> _resultRepo;
    private readonly IGenericRepository<Lesson> _lessonRepo;
    private readonly ICurrentUserService _currentUserService;

    public CertificateEligibilityReportProvider(
        IGenericRepository<Student> studentRepo,
        IGenericRepository<LessonCompletion> completionRepo,
        IGenericRepository<Result> resultRepo,
        IGenericRepository<Lesson> lessonRepo,
        ICurrentUserService currentUserService)
    {
        _studentRepo = studentRepo;
        _completionRepo = completionRepo;
        _resultRepo = resultRepo;
        _lessonRepo = lessonRepo;
        _currentUserService = currentUserService;
    }

    public string Key => "certificate-eligibility";
    public string Category => "Certificate Reports";
    public string Title => "Certificate Eligibility Report";
    public string Description => "Students who have completed 100% of their grade's lessons and passed their published exams — the eligibility basis a certificate would be issued on (this schema has no separate certificate ledger; eligibility is derived transparently from real completion and result data).";
    public IReadOnlyList<string> AllowedRoles { get; } = new[] { "principal", "staff", "teacher" };

    public IReadOnlyList<ReportColumnDefinition> Columns { get; } = new List<ReportColumnDefinition>
    {
        ReportColumnDefinition.Text("student_name", "Student", 200),
        ReportColumnDefinition.Text("grade_name", "Grade", 120),
        ReportColumnDefinition.Text("school_name", "School", 170),
        ReportColumnDefinition.Percent("completion_rate", "Course Completion %", 150),
        ReportColumnDefinition.Percent("exam_pass_rate", "Exam Pass %", 130),
        ReportColumnDefinition.Boolean("eligible", "Eligible", 100),
    };

    public async Task<ReportDataResult> GetDataAsync(ReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        var students = await _studentRepo.GetAllAsync(q =>
        {
            IQueryable<Student> query = q.Where(s => s.IsActive);
            if (filter.SchoolId.HasValue) query = query.Where(s => s.SchoolId == filter.SchoolId.Value);
            if (filter.GradeId.HasValue) query = query.Where(s => s.GradeId == filter.GradeId.Value);
            if (filter.StudentId.HasValue) query = query.Where(s => s.Id == filter.StudentId.Value);
            return query.Include(s => s.School).Include(s => s.Grade);
        });

        var studentIds = students.Select(s => s.Id).ToList();
        var completions = studentIds.Count == 0 ? new List<LessonCompletion>() : await _completionRepo.GetAllAsync(q => q.Where(c => studentIds.Contains(c.StudentId)));
        var results = studentIds.Count == 0 ? new List<Result>() : await _resultRepo.GetAllAsync(q => q.Where(r => r.IsPublished && studentIds.Contains(r.StudentId)).Include(r => r.Exam));

        var completionsByStudent = completions.GroupBy(c => c.StudentId).ToDictionary(g => g.Key, g => g.Count());
        var resultsByStudent = results.GroupBy(r => r.StudentId).ToDictionary(g => g.Key, g => g.ToList());

        // Units/Topics are keyed by the school-agnostic master GradeLevelId now — Grade
        // no longer has a Modules nav, so resolve each grade level's total lesson count
        // via a direct Lesson query instead of walking Grade.Modules.Lessons.
        var gradeLevelIds = students
            .Where(s => s.Grade != null && s.Grade.GradeLevelId.HasValue)
            .Select(s => s.Grade!.GradeLevelId!.Value)
            .Distinct()
            .ToList();
        var lessonCountByGradeLevel = gradeLevelIds.Count == 0
            ? new Dictionary<Guid, int>()
            : (await _lessonRepo.GetAllAsync(q => q
                  .Include(l => l.Module)
                  .Where(l => gradeLevelIds.Contains(l.Module.GradeLevelId))))
              .GroupBy(l => l.Module.GradeLevelId)
              .ToDictionary(g => g.Key, g => g.Count());

        bool Passed(Result r) => r.Exam?.PassingMarks is null || r.ObtainedMarks >= r.Exam.PassingMarks.Value;

        var computed = students.Select(s =>
        {
            var totalLessons = s.Grade?.GradeLevelId is Guid glId ? lessonCountByGradeLevel.GetValueOrDefault(glId) : 0;
            var completed = completionsByStudent.GetValueOrDefault(s.Id);
            var completionRate = ReportProviderHelpers.SafePercentage(completed, totalLessons);

            var studentResults = resultsByStudent.GetValueOrDefault(s.Id) ?? new List<Result>();
            var passRate = ReportProviderHelpers.SafePercentage(studentResults.Count(Passed), studentResults.Count);

            var eligible = totalLessons > 0 && completed >= totalLessons && studentResults.Count > 0 && studentResults.All(Passed);

            return new { Student = s, CompletionRate = completionRate, PassRate = passRate, Eligible = eligible };
        }).ToList();

        if (string.Equals(filter.Status, "eligible", StringComparison.OrdinalIgnoreCase)) computed = computed.Where(c => c.Eligible).ToList();
        else if (string.Equals(filter.Status, "ineligible", StringComparison.OrdinalIgnoreCase)) computed = computed.Where(c => !c.Eligible).ToList();

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim();
            computed = computed.Where(c => ReportProviderHelpers.ContainsIgnoreCase(ReportProviderHelpers.FullName(c.Student.FirstName, c.Student.LastName), term)).ToList();
        }

        var ordered = (filter.SortBy?.ToLowerInvariant()) switch
        {
            "completion_rate" => computed.OrderBy(c => c.CompletionRate).ToList(),
            "exam_pass_rate" => computed.OrderBy(c => c.PassRate).ToList(),
            _ => computed.OrderBy(c => ReportProviderHelpers.FullName(c.Student.FirstName, c.Student.LastName)).ToList(),
        };
        if (string.Equals(filter.SortDirection, "desc", StringComparison.OrdinalIgnoreCase)) ordered.Reverse();

        var totalCount = ordered.Count;
        var page = filter.Page < 1 ? 1 : filter.Page;
        var pageSize = filter.PageSize <= 0 ? 25 : filter.PageSize;
        var pageItems = ordered.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        var rows = pageItems.Select(c => new Dictionary<string, object?>
        {
            ["student_name"] = ReportProviderHelpers.FullName(c.Student.FirstName, c.Student.LastName),
            ["grade_name"] = c.Student.Grade?.GradeName,
            ["school_name"] = c.Student.School?.Name,
            ["completion_rate"] = c.CompletionRate,
            ["exam_pass_rate"] = c.PassRate,
            ["eligible"] = c.Eligible,
        }).ToList();

        var eligibleCount = computed.Count(c => c.Eligible);

        return new ReportDataResult
        {
            Rows = rows,
            TotalCount = totalCount,
            Kpis = new List<ReportKpiDto>
            {
                ReportKpiDto.Number("students_assessed", "Students Assessed", computed.Count, "Users"),
                ReportKpiDto.Number("eligible_students", "Eligible Students", eligibleCount, "Award"),
                ReportKpiDto.Percent("eligibility_rate", "Eligibility %", ReportProviderHelpers.SafePercentage(eligibleCount, computed.Count), "TrendingUp"),
            },
            Charts = new List<ReportChartDto>
            {
                new ReportChartDto
                {
                    Key = "eligibility_split",
                    Title = "Eligible vs Not Yet Eligible",
                    Type = ReportChartType.Donut,
                    Labels = new List<string> { "Eligible", "Not Yet Eligible" },
                    Series = new List<ReportChartSeriesDto> { new() { Name = "Students", Data = new List<decimal> { eligibleCount, computed.Count - eligibleCount } } }
                }
            },
            SummaryNote = $"{rows.Count} of {totalCount} students shown — {eligibleCount} currently meet certificate-eligibility criteria (100% lesson completion + all published exams passed)."
        };
    }
}
