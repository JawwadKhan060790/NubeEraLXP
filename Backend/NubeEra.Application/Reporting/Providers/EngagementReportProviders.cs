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

/// <summary>"Event Reports" — registration/participation analytics per event: registrants, approval status mix, attendance, and outcomes.</summary>
public class EventParticipationReportProvider : IReportDataProvider
{
    private readonly IGenericRepository<Event> _eventRepo;
    private readonly ICurrentUserService _currentUserService;

    public EventParticipationReportProvider(IGenericRepository<Event> eventRepo, ICurrentUserService currentUserService)
    {
        _eventRepo = eventRepo;
        _currentUserService = currentUserService;
    }

    public string Key => "event-participation";
    public string Category => "Event Reports";
    public string Title => "Event Participation Report";
    public string Description => "Per-event registration, approval, attendance, and outcome counts drawn from actual event registrations.";
    public IReadOnlyList<string> AllowedRoles { get; } = new[] { "principal", "staff", "teacher" };

    public IReadOnlyList<ReportColumnDefinition> Columns { get; } = new List<ReportColumnDefinition>
    {
        ReportColumnDefinition.Text("title", "Event", 220),
        ReportColumnDefinition.Date("date", "Date", 120),
        ReportColumnDefinition.Text("category", "Category", 140),
        ReportColumnDefinition.Text("status", "Status", 110),
        ReportColumnDefinition.Number("registrations", "Registrations", 130),
        ReportColumnDefinition.Number("approved", "Approved", 100),
        ReportColumnDefinition.Number("attended", "Attended", 100),
        ReportColumnDefinition.Percent("attendance_rate", "Attendance %", 130),
    };

    public async Task<ReportDataResult> GetDataAsync(ReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        var (start, end) = filter.ResolveDateRange();

        var events = await _eventRepo.GetAllAsync(q =>
        {
            IQueryable<Event> query = q;
            if (filter.SchoolId.HasValue) query = query.Where(e => e.SchoolId == filter.SchoolId.Value || e.SchoolId == null);
            if (start.HasValue) query = query.Where(e => e.Date >= start.Value);
            if (end.HasValue) query = query.Where(e => e.Date <= end.Value);
            if (!string.IsNullOrWhiteSpace(filter.Status)) query = query.Where(e => e.Status == filter.Status);

            return query.Include(e => e.Registrations);
        });

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim();
            events = events.Where(e => ReportProviderHelpers.ContainsIgnoreCase(e.Title, term) || ReportProviderHelpers.ContainsIgnoreCase(e.Category, term)).ToList();
        }

        var keySelectors = new Dictionary<string, Func<Event, IComparable?>>(StringComparer.OrdinalIgnoreCase)
        {
            ["title"] = e => e.Title,
            ["date"] = e => e.Date,
            ["registrations"] = e => e.Registrations.Count,
        };

        var page = ReportProviderHelpers.SortAndPage(events, filter, keySelectors, "date", out var totalCount);

        var rows = page.Select(e =>
        {
            var approved = e.Registrations.Count(r => r.Status == "Approved" || r.Status == "Completed");
            var attended = e.Registrations.Count(r => r.AttendanceStatus == "Present");
            return new Dictionary<string, object?>
            {
                ["title"] = e.Title,
                ["date"] = e.Date,
                ["category"] = e.Category,
                ["status"] = e.Status,
                ["registrations"] = e.Registrations.Count,
                ["approved"] = approved,
                ["attended"] = attended,
                ["attendance_rate"] = ReportProviderHelpers.SafePercentage(attended, e.Registrations.Count),
            };
        }).ToList();

        var totalRegistrations = events.Sum(e => e.Registrations.Count);
        var totalAttended = events.Sum(e => e.Registrations.Count(r => r.AttendanceStatus == "Present"));
        var byCategory = events.GroupBy(e => e.Category).Select(g => new { g.Key, Count = g.Sum(e => e.Registrations.Count) }).OrderByDescending(g => g.Count).Take(8).ToList();

        return new ReportDataResult
        {
            Rows = rows,
            TotalCount = totalCount,
            Kpis = new List<ReportKpiDto>
            {
                ReportKpiDto.Number("total_events", "Events", events.Count, "CalendarDays"),
                ReportKpiDto.Number("total_registrations", "Registrations", totalRegistrations, "Users"),
                ReportKpiDto.Percent("attendance_rate", "Attendance %", ReportProviderHelpers.SafePercentage(totalAttended, totalRegistrations), "CalendarCheck"),
            },
            Charts = new List<ReportChartDto>
            {
                ReportChartDto.Single("registrations_by_category", "Registrations by Category", ReportChartType.Bar,
                    byCategory.Select(g => g.Key), "Registrations", byCategory.Select(g => (decimal)g.Count), "Registrations")
            },
            SummaryNote = $"{rows.Count} of {totalCount} events shown — {totalRegistrations} total registrations."
        };
    }
}

/// <summary>"Learning Progress Reports" — per-student lesson-completion progress against their grade's curriculum, the same metric <see cref="NubeEra.Application.Services.ParentService"/> surfaces on the parent dashboard, here exposed as a filterable/exportable report.</summary>
public class LearningProgressReportProvider : IReportDataProvider
{
    private readonly IGenericRepository<Student> _studentRepo;
    private readonly IGenericRepository<LessonCompletion> _completionRepo;
    private readonly IGenericRepository<Lesson> _lessonRepo;
    private readonly ICurrentUserService _currentUserService;

    public LearningProgressReportProvider(
        IGenericRepository<Student> studentRepo,
        IGenericRepository<LessonCompletion> completionRepo,
        IGenericRepository<Lesson> lessonRepo,
        ICurrentUserService currentUserService)
    {
        _studentRepo = studentRepo;
        _completionRepo = completionRepo;
        _lessonRepo = lessonRepo;
        _currentUserService = currentUserService;
    }

    public string Key => "learning-progress";
    public string Category => "Learning Progress Reports";
    public string Title => "Learning Progress Report";
    public string Description => "Lesson-completion progress per student against their grade's curriculum, with cohort averages and distribution.";
    public IReadOnlyList<string> AllowedRoles { get; } = new[] { "principal", "staff", "teacher", "parent", "student" };

    public IReadOnlyList<ReportColumnDefinition> Columns { get; } = new List<ReportColumnDefinition>
    {
        ReportColumnDefinition.Text("student_name", "Student", 200),
        ReportColumnDefinition.Text("grade_name", "Grade", 120),
        ReportColumnDefinition.Number("completed_lessons", "Completed", 110),
        ReportColumnDefinition.Number("total_lessons", "Total Lessons", 120),
        ReportColumnDefinition.Percent("progress_rate", "Progress %", 110),
        ReportColumnDefinition.Date("last_activity", "Last Activity", 130),
    };

    public async Task<ReportDataResult> GetDataAsync(ReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        var students = await _studentRepo.GetAllAsync(q =>
        {
            IQueryable<Student> query = q.Where(s => s.IsActive);
            if (filter.SchoolId.HasValue) query = query.Where(s => s.SchoolId == filter.SchoolId.Value);
            if (filter.GradeId.HasValue) query = query.Where(s => s.GradeId == filter.GradeId.Value);
            if (filter.StudentId.HasValue) query = query.Where(s => s.Id == filter.StudentId.Value);
            return query.Include(s => s.Grade);
        });

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim();
            students = students.Where(s => ReportProviderHelpers.ContainsIgnoreCase(ReportProviderHelpers.FullName(s.FirstName, s.LastName), term)).ToList();
        }

        var studentIds = students.Select(s => s.Id).ToList();
        var completions = studentIds.Count == 0 ? new List<LessonCompletion>() : await _completionRepo.GetAllAsync(q => q.Where(c => studentIds.Contains(c.StudentId)));
        var completionsByStudent = completions.GroupBy(c => c.StudentId).ToDictionary(g => g.Key, g => g.ToList());

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

        var computed = students.Select(s =>
        {
            var totalLessons = s.Grade?.GradeLevelId is Guid glId ? lessonCountByGradeLevel.GetValueOrDefault(glId) : 0;
            var studentCompletions = completionsByStudent.GetValueOrDefault(s.Id) ?? new List<LessonCompletion>();
            return new
            {
                Student = s,
                Total = totalLessons,
                Completed = studentCompletions.Count,
                Rate = ReportProviderHelpers.SafePercentage(studentCompletions.Count, totalLessons),
                LastActivity = studentCompletions.Count == 0 ? (DateTime?)null : studentCompletions.Max(c => c.CompletionDate),
            };
        }).ToList();

        var ordered = (filter.SortBy?.ToLowerInvariant()) switch
        {
            "progress_rate" => computed.OrderBy(c => c.Rate).ToList(),
            "completed_lessons" => computed.OrderBy(c => c.Completed).ToList(),
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
            ["completed_lessons"] = c.Completed,
            ["total_lessons"] = c.Total,
            ["progress_rate"] = c.Rate,
            ["last_activity"] = c.LastActivity,
        }).ToList();

        var avgProgress = computed.Count == 0 ? 0m : Math.Round(computed.Average(c => c.Rate), 1);
        var buckets = new[] { (Label: "0-25%", Min: 0m, Max: 25m), (Label: "26-50%", Min: 26m, Max: 50m), (Label: "51-75%", Min: 51m, Max: 75m), (Label: "76-100%", Min: 76m, Max: 100m) };
        var distribution = buckets.Select(b => new { b.Label, Count = computed.Count(c => c.Rate >= b.Min && c.Rate <= b.Max) }).ToList();

        return new ReportDataResult
        {
            Rows = rows,
            TotalCount = totalCount,
            Kpis = new List<ReportKpiDto>
            {
                ReportKpiDto.Number("students_tracked", "Students Tracked", computed.Count, "Users"),
                ReportKpiDto.Percent("avg_progress", "Average Progress %", avgProgress, "TrendingUp"),
                ReportKpiDto.Number("completed_curriculum", "100% Complete", computed.Count(c => c.Total > 0 && c.Completed >= c.Total), "Award"),
            },
            Charts = new List<ReportChartDto>
            {
                ReportChartDto.Single("progress_distribution", "Progress Distribution", ReportChartType.Bar,
                    distribution.Select(d => d.Label), "Students", distribution.Select(d => (decimal)d.Count), "Students")
            },
            SummaryNote = $"{rows.Count} of {totalCount} students shown — {avgProgress}% average progress."
        };
    }
}

/// <summary>"Performance Reports" — cross-cutting leaderboard ranking students by average exam score (the directive separates "Performance Reports" from "Assessment/Examination Reports"; this report is the ranking/leaderboard lens, those are the exam-centric lenses — distinct views over the same <see cref="Result"/> data, not a duplicate engine).</summary>
public class PerformanceLeaderboardReportProvider : IReportDataProvider
{
    private readonly IGenericRepository<Result> _resultRepo;
    private readonly ICurrentUserService _currentUserService;

    public PerformanceLeaderboardReportProvider(IGenericRepository<Result> resultRepo, ICurrentUserService currentUserService)
    {
        _resultRepo = resultRepo;
        _currentUserService = currentUserService;
    }

    public string Key => "performance-leaderboard";
    public string Category => "Performance Reports";
    public string Title => "Performance Leaderboard Report";
    public string Description => "Students ranked by average exam score % across published results, with rank, average score, and exams taken.";
    public IReadOnlyList<string> AllowedRoles { get; } = new[] { "principal", "staff", "teacher" };

    public IReadOnlyList<ReportColumnDefinition> Columns { get; } = new List<ReportColumnDefinition>
    {
        ReportColumnDefinition.Number("rank", "Rank", 80),
        ReportColumnDefinition.Text("student_name", "Student", 200),
        ReportColumnDefinition.Text("grade_name", "Grade", 120),
        ReportColumnDefinition.Number("exams_taken", "Exams Taken", 120),
        ReportColumnDefinition.Percent("average_score", "Average Score %", 150),
    };

    public async Task<ReportDataResult> GetDataAsync(ReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        var results = await _resultRepo.GetAllAsync(q =>
        {
            IQueryable<Result> query = q.Where(r => r.IsPublished);
            if (filter.SchoolId.HasValue) query = query.Where(r => r.SchoolId == filter.SchoolId.Value);
            if (filter.StudentId.HasValue) query = query.Where(r => r.StudentId == filter.StudentId.Value);
            return query.Include(r => r.Student).ThenInclude(s => s.Grade).Include(r => r.Exam);
        });

        if (filter.GradeId.HasValue) results = results.Where(r => r.Student?.GradeId == filter.GradeId.Value).ToList();

        var leaderboard = results
            .Where(r => r.Exam?.TotalMarks is > 0)
            .GroupBy(r => r.StudentId)
            .Select(g => new
            {
                Student = g.First().Student,
                ExamsTaken = g.Count(),
                AverageScore = Math.Round(g.Average(r => (decimal)r.ObtainedMarks / r.Exam!.TotalMarks!.Value * 100m), 1),
            })
            .OrderByDescending(x => x.AverageScore)
            .ToList();

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim();
            leaderboard = leaderboard.Where(x => ReportProviderHelpers.ContainsIgnoreCase(ReportProviderHelpers.FullName(x.Student?.FirstName, x.Student?.LastName), term)).ToList();
        }

        var ranked = leaderboard.Select((x, idx) => new { Rank = idx + 1, x.Student, x.ExamsTaken, x.AverageScore }).ToList();

        var totalCount = ranked.Count;
        var page = filter.Page < 1 ? 1 : filter.Page;
        var pageSize = filter.PageSize <= 0 ? 25 : filter.PageSize;
        var pageItems = ranked.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        var rows = pageItems.Select(x => new Dictionary<string, object?>
        {
            ["rank"] = x.Rank,
            ["student_name"] = ReportProviderHelpers.FullName(x.Student?.FirstName, x.Student?.LastName),
            ["grade_name"] = x.Student?.Grade?.GradeName,
            ["exams_taken"] = x.ExamsTaken,
            ["average_score"] = x.AverageScore,
        }).ToList();

        var topTen = ranked.Take(10).ToList();

        return new ReportDataResult
        {
            Rows = rows,
            TotalCount = totalCount,
            Kpis = new List<ReportKpiDto>
            {
                ReportKpiDto.Number("students_ranked", "Students Ranked", ranked.Count, "Users"),
                ReportKpiDto.Percent("top_score", "Top Average %", ranked.Count == 0 ? 0 : ranked[0].AverageScore, "Trophy"),
                ReportKpiDto.Percent("cohort_average", "Cohort Average %", ranked.Count == 0 ? 0 : Math.Round(ranked.Average(x => x.AverageScore), 1), "TrendingUp"),
            },
            Charts = new List<ReportChartDto>
            {
                ReportChartDto.Single("top_performers", "Top 10 by Average Score %", ReportChartType.Bar,
                    topTen.Select(x => ReportProviderHelpers.FullName(x.Student?.FirstName, x.Student?.LastName)), "Average %",
                    topTen.Select(x => x.AverageScore), "%")
            },
            SummaryNote = $"{rows.Count} of {totalCount} ranked students shown."
        };
    }
}
