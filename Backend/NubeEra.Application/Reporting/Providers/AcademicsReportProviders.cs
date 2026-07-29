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

/// <summary>"Attendance Reports" — school/grade-level daily roll-up (the cohort view; the per-student ledger lives in <see cref="StudentAttendanceReportProvider"/>, avoiding a duplicate engine for the same data sliced two ways).</summary>
public class AttendanceDailySummaryReportProvider : IReportDataProvider
{
    private readonly IGenericRepository<Attendance> _attendanceRepo;
    private readonly ICurrentUserService _currentUserService;

    public AttendanceDailySummaryReportProvider(IGenericRepository<Attendance> attendanceRepo, ICurrentUserService currentUserService)
    {
        _attendanceRepo = attendanceRepo;
        _currentUserService = currentUserService;
    }

    public string Key => "attendance-daily-summary";
    public string Category => "Attendance Reports";
    public string Title => "Daily Attendance Summary";
    public string Description => "One row per school day: present/absent/late/excused counts and the resulting attendance % for the selected scope.";
    public IReadOnlyList<string> AllowedRoles { get; } = new[] { "principal", "staff", "teacher" };

    public IReadOnlyList<ReportColumnDefinition> Columns { get; } = new List<ReportColumnDefinition>
    {
        ReportColumnDefinition.Date("date", "Date", 120),
        ReportColumnDefinition.Number("total_records", "Total Marked", 120),
        ReportColumnDefinition.Number("present_count", "Present", 100),
        ReportColumnDefinition.Number("absent_count", "Absent", 100),
        ReportColumnDefinition.Number("late_count", "Late", 90),
        ReportColumnDefinition.Number("excused_count", "Excused", 100),
        ReportColumnDefinition.Percent("attendance_rate", "Attendance %", 120),
    };

    public async Task<ReportDataResult> GetDataAsync(ReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        var (start, end) = filter.ResolveDateRange();
        start ??= DateTime.UtcNow.Date.AddDays(-30);
        end ??= DateTime.UtcNow.Date;

        var records = await _attendanceRepo.GetAllAsync(q =>
        {
            IQueryable<Attendance> query = q.Where(a => a.Date >= start.Value && a.Date <= end.Value);
            if (filter.SchoolId.HasValue) query = query.Where(a => a.SchoolId == filter.SchoolId.Value);
            if (filter.TeacherId.HasValue) query = query.Where(a => a.TeacherId == filter.TeacherId.Value);
            return query.Include(a => a.Student);
        });

        if (filter.GradeId.HasValue) records = records.Where(a => a.Student != null && a.Student.GradeId == filter.GradeId.Value).ToList();

        var byDate = records
            .GroupBy(a => a.Date.Date)
            .Select(g => new
            {
                Date = g.Key,
                Total = g.Count(),
                Present = g.Count(a => a.Status == AttendanceStatus.Present),
                Absent = g.Count(a => a.Status == AttendanceStatus.Absent),
                Late = g.Count(a => a.Status == AttendanceStatus.Late),
                Excused = g.Count(a => a.Status == AttendanceStatus.Excused),
            })
            .ToList();

        var ordered = string.Equals(filter.SortBy, "attendance_rate", StringComparison.OrdinalIgnoreCase)
            ? (string.Equals(filter.SortDirection, "asc", StringComparison.OrdinalIgnoreCase)
                ? byDate.OrderBy(d => ReportProviderHelpers.SafePercentage(d.Present + d.Late, d.Total)).ToList()
                : byDate.OrderByDescending(d => ReportProviderHelpers.SafePercentage(d.Present + d.Late, d.Total)).ToList())
            : (string.Equals(filter.SortDirection, "asc", StringComparison.OrdinalIgnoreCase)
                ? byDate.OrderBy(d => d.Date).ToList()
                : byDate.OrderByDescending(d => d.Date).ToList());

        var totalCount = ordered.Count;
        var page = filter.Page < 1 ? 1 : filter.Page;
        var pageSize = filter.PageSize <= 0 ? 25 : filter.PageSize;
        var pageItems = ordered.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        var rows = pageItems.Select(d => new Dictionary<string, object?>
        {
            ["date"] = d.Date,
            ["total_records"] = d.Total,
            ["present_count"] = d.Present,
            ["absent_count"] = d.Absent,
            ["late_count"] = d.Late,
            ["excused_count"] = d.Excused,
            ["attendance_rate"] = ReportProviderHelpers.SafePercentage(d.Present + d.Late, d.Total),
        }).ToList();

        var overallRate = ReportProviderHelpers.SafePercentage(
            records.Count(a => a.Status == AttendanceStatus.Present || a.Status == AttendanceStatus.Late), records.Count);

        var trend = byDate.OrderBy(d => d.Date).TakeLast(14).ToList();

        return new ReportDataResult
        {
            Rows = rows,
            TotalCount = totalCount,
            Kpis = new List<ReportKpiDto>
            {
                ReportKpiDto.Number("school_days", "School Days", byDate.Count, "Calendar"),
                ReportKpiDto.Number("total_records", "Attendance Records", records.Count, "ClipboardList"),
                ReportKpiDto.Percent("overall_attendance_rate", "Overall Attendance %", overallRate, "CalendarCheck"),
            },
            Charts = new List<ReportChartDto>
            {
                ReportChartDto.Single("daily_attendance_trend", "Attendance % (last 14 school days)", ReportChartType.Line,
                    trend.Select(d => d.Date.ToString("dd MMM")), "Attendance %",
                    trend.Select(d => ReportProviderHelpers.SafePercentage(d.Present + d.Late, d.Total)), "%"),
                new ReportChartDto
                {
                    Key = "status_totals",
                    Title = "Status Totals (selected range)",
                    Type = ReportChartType.Bar,
                    Labels = new List<string> { "Present", "Absent", "Late", "Excused" },
                    Series = new List<ReportChartSeriesDto>
                    {
                        new() { Name = "Records", Data = new List<decimal>
                        {
                            records.Count(a => a.Status == AttendanceStatus.Present),
                            records.Count(a => a.Status == AttendanceStatus.Absent),
                            records.Count(a => a.Status == AttendanceStatus.Late),
                            records.Count(a => a.Status == AttendanceStatus.Excused),
                        } }
                    }
                }
            },
            SummaryNote = $"{rows.Count} of {totalCount} school days shown — {overallRate}% overall attendance for the selected range."
        };
    }
}

/// <summary>"Enrollment Reports" — month-over-month new-admission trend by school/grade, derived from <see cref="Student.AdmissionDate"/> (the same field the roster already stores — no synthetic enrollment-event log exists, nor is one needed for a trend view).</summary>
public class EnrollmentTrendReportProvider : IReportDataProvider
{
    private readonly IGenericRepository<Student> _studentRepo;
    private readonly ICurrentUserService _currentUserService;

    public EnrollmentTrendReportProvider(IGenericRepository<Student> studentRepo, ICurrentUserService currentUserService)
    {
        _studentRepo = studentRepo;
        _currentUserService = currentUserService;
    }

    public string Key => "enrollment-trend";
    public string Category => "Enrollment Reports";
    public string Title => "Enrollment Trend Report";
    public string Description => "New-admission counts per month, with grade and school breakdowns, drawn from student admission dates.";
    public IReadOnlyList<string> AllowedRoles { get; } = new[] { "principal", "staff" };

    public IReadOnlyList<ReportColumnDefinition> Columns { get; } = new List<ReportColumnDefinition>
    {
        ReportColumnDefinition.Text("month", "Month", 110),
        ReportColumnDefinition.Text("school_name", "School", 180),
        ReportColumnDefinition.Text("grade_name", "Grade", 120),
        ReportColumnDefinition.Number("new_enrollments", "New Enrollments", 140),
    };

    public async Task<ReportDataResult> GetDataAsync(ReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        var (start, end) = filter.ResolveDateRange();
        end ??= DateTime.UtcNow.Date;
        start ??= new DateTime(end.Value.Year, end.Value.Month, 1).AddMonths(-11);

        var students = await _studentRepo.GetAllAsync(q =>
        {
            IQueryable<Student> query = q.Where(s => s.AdmissionDate != null && s.AdmissionDate >= start.Value && s.AdmissionDate <= end.Value);
            if (filter.SchoolId.HasValue) query = query.Where(s => s.SchoolId == filter.SchoolId.Value);
            if (filter.GradeId.HasValue) query = query.Where(s => s.GradeId == filter.GradeId.Value);
            return query.Include(s => s.School).Include(s => s.Grade);
        });

        var grouped = students
            .GroupBy(s => new { Month = new DateTime(s.AdmissionDate!.Value.Year, s.AdmissionDate.Value.Month, 1), School = s.School?.Name ?? "Unassigned", Grade = s.Grade?.GradeName ?? "Unassigned" })
            .Select(g => new { g.Key.Month, g.Key.School, g.Key.Grade, Count = g.Count() })
            .OrderByDescending(g => g.Month)
            .ToList();

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim();
            grouped = grouped.Where(g => ReportProviderHelpers.ContainsIgnoreCase(g.School, term) || ReportProviderHelpers.ContainsIgnoreCase(g.Grade, term)).ToList();
        }

        var totalCount = grouped.Count;
        var page = filter.Page < 1 ? 1 : filter.Page;
        var pageSize = filter.PageSize <= 0 ? 25 : filter.PageSize;
        var pageItems = grouped.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        var rows = pageItems.Select(g => new Dictionary<string, object?>
        {
            ["month"] = g.Month.ToString("MMM yyyy"),
            ["school_name"] = g.School,
            ["grade_name"] = g.Grade,
            ["new_enrollments"] = g.Count,
        }).ToList();

        var monthly = students
            .GroupBy(s => new DateTime(s.AdmissionDate!.Value.Year, s.AdmissionDate.Value.Month, 1))
            .OrderBy(g => g.Key)
            .ToList();

        var byGrade = students.GroupBy(s => s.Grade?.GradeName ?? "Unassigned").OrderByDescending(g => g.Count()).Take(10).ToList();

        return new ReportDataResult
        {
            Rows = rows,
            TotalCount = totalCount,
            Kpis = new List<ReportKpiDto>
            {
                ReportKpiDto.Number("total_new_enrollments", "New Enrollments", students.Count, "UserPlus"),
                ReportKpiDto.Number("months_covered", "Months Covered", monthly.Count, "Calendar"),
                ReportKpiDto.Number("avg_per_month", "Avg / Month", monthly.Count == 0 ? 0 : (int)Math.Round(students.Count / (double)monthly.Count), "TrendingUp"),
            },
            Charts = new List<ReportChartDto>
            {
                ReportChartDto.Single("enrollment_trend", "New Enrollments by Month", ReportChartType.Area,
                    monthly.Select(g => g.Key.ToString("MMM yyyy")), "New Enrollments", monthly.Select(g => (decimal)g.Count()), "Students"),
                ReportChartDto.Single("enrollment_by_grade", "New Enrollments by Grade", ReportChartType.Bar,
                    byGrade.Select(g => g.Key), "Students", byGrade.Select(g => (decimal)g.Count()), "Students")
            },
            SummaryNote = $"{rows.Count} of {totalCount} month/grade groups shown — {students.Count} new enrollments in range."
        };
    }
}

/// <summary>"Course Reports" — catalog view of <see cref="Module"/> ("Subject"/"Course" in the UI's vocabulary — see the directive's Course filter, which this maps onto <see cref="ReportFilterDto.CourseId"/>/<see cref="ReportFilterDto.SubjectId"/>), with lesson/exam counts and the assigned teacher.</summary>
public class CourseCatalogReportProvider : IReportDataProvider
{
    private readonly IGenericRepository<Module> _moduleRepo;
    private readonly IGenericRepository<Grade> _gradeRepo;
    private readonly ICurrentUserService _currentUserService;

    public CourseCatalogReportProvider(
        IGenericRepository<Module> moduleRepo,
        IGenericRepository<Grade> gradeRepo,
        ICurrentUserService currentUserService)
    {
        _moduleRepo = moduleRepo;
        _gradeRepo = gradeRepo;
        _currentUserService = currentUserService;
    }

    public string Key => "course-catalog";
    public string Category => "Course Reports";
    public string Title => "Course / Subject Catalog Report";
    public string Description => "Every subject (course) with its grade level, credits, assigned teacher, and lesson/exam counts.";
    public IReadOnlyList<string> AllowedRoles { get; } = new[] { "principal", "staff", "teacher" };

    // Units are school-agnostic master content keyed by grade level now — there's no
    // single "School" column since one Unit may be assigned to many schools via
    // SchoolUnitAssignment (/admin/curriculum-assignment).
    public IReadOnlyList<ReportColumnDefinition> Columns { get; } = new List<ReportColumnDefinition>
    {
        ReportColumnDefinition.Text("name", "Course / Subject", 220),
        ReportColumnDefinition.Text("grade_level_name", "Grade Level", 120),
        ReportColumnDefinition.Number("credits", "Credits", 90),
        ReportColumnDefinition.Text("teacher_name", "Created By", 180),
        ReportColumnDefinition.Number("lessons_count", "Lessons", 100),
        ReportColumnDefinition.Number("exams_count", "Exams", 90),
        ReportColumnDefinition.Boolean("is_active", "Active", 90),
    };

    public async Task<ReportDataResult> GetDataAsync(ReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        // filter.GradeId is a per-school Grade.Id — translate to the master GradeLevelId
        // that Module.GradeLevelId is actually keyed on.
        Guid? filterGradeLevelId = null;
        if (filter.GradeId.HasValue)
            filterGradeLevelId = (await _gradeRepo.GetByIdAsync(filter.GradeId.Value))?.GradeLevelId;

        var modules = await _moduleRepo.GetAllAsync(q =>
        {
            IQueryable<Module> query = q;
            if (filter.SchoolId.HasValue)
                query = query.Where(m => m.SchoolAssignments.Any(a => !a.IsDeleted && a.SchoolId == filter.SchoolId.Value));
            if (filterGradeLevelId.HasValue) query = query.Where(m => m.GradeLevelId == filterGradeLevelId.Value);
            var courseId = filter.CourseId ?? filter.SubjectId;
            if (courseId.HasValue) query = query.Where(m => m.Id == courseId.Value);
            if (filter.TeacherId.HasValue) query = query.Where(m => m.CreatedByTeacherId == filter.TeacherId.Value);

            if (string.Equals(filter.Status, "active", StringComparison.OrdinalIgnoreCase)) query = query.Where(m => m.IsActive);
            else if (string.Equals(filter.Status, "inactive", StringComparison.OrdinalIgnoreCase)) query = query.Where(m => !m.IsActive);

            return query
                .Include(m => m.GradeLevel)
                .Include(m => m.CreatedByTeacher)
                .Include(m => m.Lessons)
                .Include(m => m.Exams);
        });

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim();
            modules = modules.Where(m => ReportProviderHelpers.ContainsIgnoreCase(m.Name, term) || ReportProviderHelpers.ContainsIgnoreCase(m.Description, term)).ToList();
        }

        var keySelectors = new Dictionary<string, Func<Module, IComparable?>>(StringComparer.OrdinalIgnoreCase)
        {
            ["name"] = m => m.Name,
            ["grade_level_name"] = m => m.GradeLevel?.Name,
            ["credits"] = m => m.Credits,
            ["lessons_count"] = m => m.Lessons.Count,
        };

        var page = ReportProviderHelpers.SortAndPage(modules, filter, keySelectors, "name", out var totalCount);

        var rows = page.Select(m => new Dictionary<string, object?>
        {
            ["name"] = m.Name,
            ["grade_level_name"] = m.GradeLevel?.Name,
            ["credits"] = m.Credits,
            ["teacher_name"] = m.CreatedByTeacher == null ? "Staff" : ReportProviderHelpers.FullName(m.CreatedByTeacher.FirstName, m.CreatedByTeacher.LastName),
            ["lessons_count"] = m.Lessons.Count,
            ["exams_count"] = m.Exams.Count,
            ["is_active"] = m.IsActive,
        }).ToList();

        var byGrade = modules.GroupBy(m => m.GradeLevel?.Name ?? "Unassigned").OrderByDescending(g => g.Count()).Take(10).ToList();

        return new ReportDataResult
        {
            Rows = rows,
            TotalCount = totalCount,
            Kpis = new List<ReportKpiDto>
            {
                ReportKpiDto.Number("total_courses", "Total Courses", modules.Count, "BookOpen"),
                ReportKpiDto.Number("active_courses", "Active Courses", modules.Count(m => m.IsActive), "CheckCircle"),
                ReportKpiDto.Number("total_lessons", "Total Lessons", modules.Sum(m => m.Lessons.Count), "FileText"),
            },
            Charts = new List<ReportChartDto>
            {
                ReportChartDto.Single("courses_by_grade", "Courses by Grade", ReportChartType.Bar,
                    byGrade.Select(g => g.Key), "Courses", byGrade.Select(g => (decimal)g.Count()), "Courses")
            },
            SummaryNote = $"{rows.Count} of {totalCount} courses shown."
        };
    }
}
