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

/// <summary>
/// "Student Reports" → Enrollment sub-report. KPIs per the directive's Student
/// Reports spec: Total Students, Active Students (Attendance %/Completion % are
/// covered by the sibling Attendance/Performance sub-reports below — splitting
/// KPIs across a category's sub-reports, rather than recomputing all four on
/// every screen, keeps each report's query focused and avoids five-table joins
/// on a simple roster view).
/// </summary>
public class StudentEnrollmentReportProvider : IReportDataProvider
{
    private readonly IGenericRepository<Student> _studentRepo;
    private readonly ICurrentUserService _currentUserService;

    public StudentEnrollmentReportProvider(IGenericRepository<Student> studentRepo, ICurrentUserService currentUserService)
    {
        _studentRepo = studentRepo;
        _currentUserService = currentUserService;
    }

    public string Key => "student-enrollment";
    public string Category => "Student Reports";
    public string Title => "Student Enrollment Report";
    public string Description => "Roster of enrolled students with school, grade, admission date, and active/inactive status.";
    public IReadOnlyList<string> AllowedRoles { get; } = new[] { "principal", "staff", "teacher" };

    public IReadOnlyList<ReportColumnDefinition> Columns { get; } = new List<ReportColumnDefinition>
    {
        ReportColumnDefinition.Text("student_id", "Student ID", 120),
        ReportColumnDefinition.Text("full_name", "Full Name", 200),
        ReportColumnDefinition.Text("school_name", "School", 180),
        ReportColumnDefinition.Text("grade_name", "Grade", 120),
        ReportColumnDefinition.Text("gender", "Gender", 90),
        ReportColumnDefinition.Date("admission_date", "Admission Date", 130),
        ReportColumnDefinition.Text("parent_guardian_name", "Parent / Guardian", 180),
        ReportColumnDefinition.Boolean("is_active", "Active", 90),
    };

    public async Task<ReportDataResult> GetDataAsync(ReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        var students = await _studentRepo.GetAllAsync(q =>
        {
            IQueryable<Student> query = q;

            if (filter.SchoolId.HasValue) query = query.Where(s => s.SchoolId == filter.SchoolId.Value);
            if (filter.GradeId.HasValue) query = query.Where(s => s.GradeId == filter.GradeId.Value);
            if (filter.StudentId.HasValue) query = query.Where(s => s.Id == filter.StudentId.Value);

            if (string.Equals(filter.Status, "active", StringComparison.OrdinalIgnoreCase)) query = query.Where(s => s.IsActive);
            else if (string.Equals(filter.Status, "inactive", StringComparison.OrdinalIgnoreCase)) query = query.Where(s => !s.IsActive);

            var (start, end) = filter.ResolveDateRange();
            if (start.HasValue) query = query.Where(s => s.AdmissionDate == null || s.AdmissionDate >= start.Value);
            if (end.HasValue) query = query.Where(s => s.AdmissionDate == null || s.AdmissionDate <= end.Value);

            return query.Include(s => s.School).Include(s => s.Grade);
        });

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim();
            students = students.Where(s =>
                ReportProviderHelpers.ContainsIgnoreCase(ReportProviderHelpers.FullName(s.FirstName, s.LastName), term) ||
                ReportProviderHelpers.ContainsIgnoreCase(s.StudentId, term) ||
                ReportProviderHelpers.ContainsIgnoreCase(s.Email, term) ||
                ReportProviderHelpers.ContainsIgnoreCase(s.RollNo, term)).ToList();
        }

        var keySelectors = new Dictionary<string, Func<Student, IComparable?>>(StringComparer.OrdinalIgnoreCase)
        {
            ["full_name"] = s => ReportProviderHelpers.FullName(s.FirstName, s.LastName),
            ["student_id"] = s => s.StudentId,
            ["grade_name"] = s => s.Grade?.GradeName,
            ["admission_date"] = s => s.AdmissionDate,
            ["is_active"] = s => s.IsActive,
        };

        var page = ReportProviderHelpers.SortAndPage(students, filter, keySelectors, "full_name", out var totalCount);

        var rows = page.Select(s => new Dictionary<string, object?>
        {
            ["student_id"] = s.StudentId,
            ["full_name"] = ReportProviderHelpers.FullName(s.FirstName, s.LastName),
            ["school_name"] = s.School?.Name,
            ["grade_name"] = s.Grade?.GradeName,
            ["gender"] = s.Gender,
            ["admission_date"] = s.AdmissionDate,
            ["parent_guardian_name"] = s.ParentGuardianName,
            ["is_active"] = s.IsActive,
        }).ToList();

        var activeCount = students.Count(s => s.IsActive);
        var byGrade = students
            .GroupBy(s => s.Grade?.GradeName ?? "Unassigned")
            .OrderByDescending(g => g.Count())
            .Take(10)
            .ToList();

        return new ReportDataResult
        {
            Rows = rows,
            TotalCount = totalCount,
            Kpis = new List<ReportKpiDto>
            {
                ReportKpiDto.Number("total_students", "Total Students", students.Count, "Users"),
                ReportKpiDto.Number("active_students", "Active Students", activeCount, "UserCheck"),
                ReportKpiDto.Percent("active_rate", "Active %", ReportProviderHelpers.SafePercentage(activeCount, students.Count), "TrendingUp"),
            },
            Charts = new List<ReportChartDto>
            {
                ReportChartDto.Single("students_by_grade", "Students by Grade", ReportChartType.Bar,
                    byGrade.Select(g => g.Key), "Students", byGrade.Select(g => (decimal)g.Count()), "Students"),
                new ReportChartDto
                {
                    Key = "enrollment_status",
                    Title = "Enrollment Status",
                    Type = ReportChartType.Donut,
                    Labels = new List<string> { "Active", "Inactive" },
                    Series = new List<ReportChartSeriesDto>
                    {
                        new() { Name = "Students", Data = new List<decimal> { activeCount, students.Count - activeCount } }
                    }
                }
            },
            SummaryNote = $"{rows.Count} of {totalCount} students shown."
        };
    }
}

/// <summary>
/// "Student Reports" → Attendance sub-report. Carries the directive's
/// "Attendance %" KPI for this category, computed from the SAME scoped
/// attendance rows the grid lists (never a separate hardcoded aggregate).
/// </summary>
public class StudentAttendanceReportProvider : IReportDataProvider
{
    private readonly IGenericRepository<Attendance> _attendanceRepo;
    private readonly ICurrentUserService _currentUserService;

    public StudentAttendanceReportProvider(IGenericRepository<Attendance> attendanceRepo, ICurrentUserService currentUserService)
    {
        _attendanceRepo = attendanceRepo;
        _currentUserService = currentUserService;
    }

    public string Key => "student-attendance";
    public string Category => "Student Reports";
    public string Title => "Student Attendance Report";
    public string Description => "Day-by-day student attendance records with present/absent/late/excused breakdown and attendance %.";
    public IReadOnlyList<string> AllowedRoles { get; } = new[] { "principal", "staff", "teacher", "parent", "student" };

    public IReadOnlyList<ReportColumnDefinition> Columns { get; } = new List<ReportColumnDefinition>
    {
        ReportColumnDefinition.Date("date", "Date", 120),
        ReportColumnDefinition.Text("student_name", "Student", 200),
        ReportColumnDefinition.Text("grade_name", "Grade", 120),
        ReportColumnDefinition.Text("status", "Status", 110),
        ReportColumnDefinition.Text("remarks", "Remarks", 220),
    };

    public async Task<ReportDataResult> GetDataAsync(ReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        var (start, end) = filter.ResolveDateRange();

        var records = await _attendanceRepo.GetAllAsync(q =>
        {
            IQueryable<Attendance> query = q.Where(a => a.StudentId != null);

            if (filter.SchoolId.HasValue) query = query.Where(a => a.SchoolId == filter.SchoolId.Value);
            if (filter.StudentId.HasValue) query = query.Where(a => a.StudentId == filter.StudentId.Value);
            if (start.HasValue) query = query.Where(a => a.Date >= start.Value);
            if (end.HasValue) query = query.Where(a => a.Date <= end.Value);
            if (!string.IsNullOrWhiteSpace(filter.Status) && Enum.TryParse<AttendanceStatus>(filter.Status, true, out var parsedStatus))
            {
                query = query.Where(a => a.Status == parsedStatus);
            }

            return query.Include(a => a.Student).ThenInclude(s => s!.Grade);
        });

        if (filter.GradeId.HasValue)
        {
            records = records.Where(a => a.Student?.GradeId == filter.GradeId.Value).ToList();
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim();
            records = records.Where(a =>
                ReportProviderHelpers.ContainsIgnoreCase(
                    ReportProviderHelpers.FullName(a.Student?.FirstName, a.Student?.LastName), term)).ToList();
        }

        var keySelectors = new Dictionary<string, Func<Attendance, IComparable?>>(StringComparer.OrdinalIgnoreCase)
        {
            ["date"] = a => a.Date,
            ["student_name"] = a => ReportProviderHelpers.FullName(a.Student?.FirstName, a.Student?.LastName),
            ["status"] = a => a.Status.ToString(),
        };

        var page = ReportProviderHelpers.SortAndPage(records, filter, keySelectors, "date", out var totalCount);

        var rows = page.Select(a => new Dictionary<string, object?>
        {
            ["date"] = a.Date,
            ["student_name"] = ReportProviderHelpers.FullName(a.Student?.FirstName, a.Student?.LastName),
            ["grade_name"] = a.Student?.Grade?.GradeName,
            ["status"] = a.Status.ToString(),
            ["remarks"] = a.Remarks,
        }).ToList();

        var presentCount = records.Count(a => a.Status == AttendanceStatus.Present || a.Status == AttendanceStatus.Late);
        var attendanceRate = ReportProviderHelpers.SafePercentage(presentCount, records.Count);
        var distinctStudents = records.Select(a => a.StudentId).Distinct().Count();

        var statusGroups = records.GroupBy(a => a.Status).ToDictionary(g => g.Key, g => g.Count());
        var trendBuckets = ReportProviderHelpers.LastNMonthBuckets(6, end ?? DateTime.UtcNow);
        var trendSeries = trendBuckets
            .Select(b =>
            {
                var inBucket = records.Where(a => a.Date >= b.Start && a.Date <= b.End).ToList();
                return inBucket.Count == 0 ? 0m : ReportProviderHelpers.SafePercentage(
                    inBucket.Count(a => a.Status == AttendanceStatus.Present || a.Status == AttendanceStatus.Late), inBucket.Count);
            })
            .ToList();

        return new ReportDataResult
        {
            Rows = rows,
            TotalCount = totalCount,
            Kpis = new List<ReportKpiDto>
            {
                ReportKpiDto.Number("total_students", "Students Covered", distinctStudents, "Users"),
                ReportKpiDto.Percent("attendance_rate", "Attendance %", attendanceRate, "CalendarCheck"),
                ReportKpiDto.Number("present_days", "Present/Late Records", presentCount, "CheckCircle"),
                ReportKpiDto.Number("absent_days", "Absent Records", statusGroups.GetValueOrDefault(AttendanceStatus.Absent), "XCircle"),
            },
            Charts = new List<ReportChartDto>
            {
                ReportChartDto.Single("attendance_trend", "Attendance % Trend (last 6 months)", ReportChartType.Line,
                    trendBuckets.Select(b => b.Label), "Attendance %", trendSeries, "%"),
                new ReportChartDto
                {
                    Key = "attendance_breakdown",
                    Title = "Status Breakdown",
                    Type = ReportChartType.Pie,
                    Labels = Enum.GetValues<AttendanceStatus>().Select(s => s.ToString()).ToList(),
                    Series = new List<ReportChartSeriesDto>
                    {
                        new() { Name = "Records", Data = Enum.GetValues<AttendanceStatus>().Select(s => (decimal)statusGroups.GetValueOrDefault(s)).ToList() }
                    }
                }
            },
            SummaryNote = $"{rows.Count} of {totalCount} attendance records shown — {attendanceRate}% overall attendance."
        };
    }
}

/// <summary>
/// "Student Reports" → Performance / Assessment Results sub-report. Carries the
/// "Performance %" KPI for this category, derived from <see cref="Result"/> rows
/// (the same exam-results table <c>ResultService</c> already serves from).
/// </summary>
public class StudentPerformanceReportProvider : IReportDataProvider
{
    private readonly IGenericRepository<Result> _resultRepo;
    private readonly ICurrentUserService _currentUserService;

    public StudentPerformanceReportProvider(IGenericRepository<Result> resultRepo, ICurrentUserService currentUserService)
    {
        _resultRepo = resultRepo;
        _currentUserService = currentUserService;
    }

    public string Key => "student-performance";
    public string Category => "Student Reports";
    public string Title => "Student Performance Report";
    public string Description => "Published exam results per student with marks, grade, and pass/fail outcome.";
    public IReadOnlyList<string> AllowedRoles { get; } = new[] { "principal", "staff", "teacher", "parent", "student" };

    public IReadOnlyList<ReportColumnDefinition> Columns { get; } = new List<ReportColumnDefinition>
    {
        ReportColumnDefinition.Text("student_name", "Student", 200),
        ReportColumnDefinition.Text("grade_name", "Grade", 110),
        ReportColumnDefinition.Text("exam_title", "Exam", 200),
        ReportColumnDefinition.Date("exam_date", "Exam Date", 120),
        ReportColumnDefinition.Number("obtained_marks", "Marks Obtained", 120, "0.0"),
        ReportColumnDefinition.Number("total_marks", "Total Marks", 110),
        ReportColumnDefinition.Text("grade_label", "Grade", 90),
        ReportColumnDefinition.Text("outcome", "Outcome", 100),
    };

    public async Task<ReportDataResult> GetDataAsync(ReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        var (start, end) = filter.ResolveDateRange();

        var results = await _resultRepo.GetAllAsync(q =>
        {
            IQueryable<Result> query = q.Where(r => r.IsPublished);

            if (filter.SchoolId.HasValue) query = query.Where(r => r.SchoolId == filter.SchoolId.Value);
            if (filter.StudentId.HasValue) query = query.Where(r => r.StudentId == filter.StudentId.Value);

            return query
                .Include(r => r.Student).ThenInclude(s => s!.Grade)
                .Include(r => r.Exam);
        });

        if (filter.GradeId.HasValue) results = results.Where(r => r.Student?.GradeId == filter.GradeId.Value).ToList();
        if (start.HasValue) results = results.Where(r => r.Exam == null || r.Exam.Date >= start.Value).ToList();
        if (end.HasValue) results = results.Where(r => r.Exam == null || r.Exam.Date <= end.Value).ToList();
        if (filter.SubjectId.HasValue || filter.CourseId.HasValue)
        {
            var moduleId = filter.SubjectId ?? filter.CourseId;
            results = results.Where(r => r.Exam?.ModuleId == moduleId).ToList();
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim();
            results = results.Where(r =>
                ReportProviderHelpers.ContainsIgnoreCase(ReportProviderHelpers.FullName(r.Student?.FirstName, r.Student?.LastName), term) ||
                ReportProviderHelpers.ContainsIgnoreCase(r.Exam?.Title, term)).ToList();
        }

        bool Passed(Result r) => r.ObtainedMarks >= (r.Exam?.PassingMarks ?? (int)Math.Ceiling((r.Exam?.TotalMarks ?? 100) * 0.40));

        var keySelectors = new Dictionary<string, Func<Result, IComparable?>>(StringComparer.OrdinalIgnoreCase)
        {
            ["student_name"] = r => ReportProviderHelpers.FullName(r.Student?.FirstName, r.Student?.LastName),
            ["exam_date"] = r => r.Exam?.Date,
            ["obtained_marks"] = r => r.ObtainedMarks,
            ["exam_title"] = r => r.Exam?.Title,
        };

        var page = ReportProviderHelpers.SortAndPage(results, filter, keySelectors, "exam_date", out var totalCount);

        var rows = page.Select(r => new Dictionary<string, object?>
        {
            ["student_name"] = ReportProviderHelpers.FullName(r.Student?.FirstName, r.Student?.LastName),
            ["grade_name"] = r.Student?.Grade?.GradeName,
            ["exam_title"] = r.Exam?.Title ?? "Exam",
            ["exam_date"] = r.Exam?.Date,
            ["obtained_marks"] = r.ObtainedMarks,
            ["total_marks"] = r.Exam?.TotalMarks,
            ["grade_label"] = r.Grade,
            ["outcome"] = Passed(r) ? "Pass" : "Fail",
        }).ToList();

        var passCount = results.Count(Passed);
        var avgScorePercent = results.Count == 0
            ? 0m
            : Math.Round(results
                .Where(r => r.Exam?.TotalMarks is > 0)
                .Select(r => (decimal)r.ObtainedMarks / r.Exam!.TotalMarks!.Value * 100m)
                .DefaultIfEmpty(0m)
                .Average(), 1);

        var byGrade = results
            .GroupBy(r => r.Student?.Grade?.GradeName ?? "Unassigned")
            .Select(g => new { Grade = g.Key, Avg = g.Where(r => r.Exam?.TotalMarks is > 0).Select(r => (decimal)r.ObtainedMarks / r.Exam!.TotalMarks!.Value * 100m).DefaultIfEmpty(0m).Average() })
            .OrderByDescending(g => g.Avg)
            .Take(10)
            .ToList();

        return new ReportDataResult
        {
            Rows = rows,
            TotalCount = totalCount,
            Kpis = new List<ReportKpiDto>
            {
                ReportKpiDto.Number("total_results", "Results Recorded", results.Count, "FileText"),
                ReportKpiDto.Percent("performance_rate", "Performance %", avgScorePercent, "TrendingUp"),
                ReportKpiDto.Percent("pass_rate", "Pass %", ReportProviderHelpers.SafePercentage(passCount, results.Count), "Award"),
            },
            Charts = new List<ReportChartDto>
            {
                ReportChartDto.Single("performance_by_grade", "Average Score % by Grade", ReportChartType.Bar,
                    byGrade.Select(g => g.Grade), "Average %", byGrade.Select(g => Math.Round(g.Avg, 1)), "%"),
                new ReportChartDto
                {
                    Key = "pass_fail_split",
                    Title = "Pass / Fail Split",
                    Type = ReportChartType.Donut,
                    Labels = new List<string> { "Pass", "Fail" },
                    Series = new List<ReportChartSeriesDto> { new() { Name = "Results", Data = new List<decimal> { passCount, results.Count - passCount } } }
                }
            },
            SummaryNote = $"{rows.Count} of {totalCount} published results shown — {avgScorePercent}% average score."
        };
    }
}
