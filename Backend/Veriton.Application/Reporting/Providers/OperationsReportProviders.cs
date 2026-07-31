using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Veriton.Application.Common.Reporting;
using Veriton.Application.Interfaces.Repositories;
using Veriton.Application.Interfaces.Security;
using Veriton.Application.Interfaces.Services.Reporting;
using Veriton.Domain.Entities;

namespace Veriton.Application.Reporting.Providers;

/// <summary>
/// "Financial Reports" — this schema has no dedicated tuition/fee ledger; the
/// only real money-movement entity is the e-commerce <see cref="Order"/> /
/// <see cref="OrderItem"/> pair (school-store purchases). Rather than invent a
/// fee module, this report transparently repurposes that real transactional
/// data — every figure traces to an actual order row — and is named/described
/// accordingly so nobody mistakes it for a tuition ledger that doesn't exist
/// (see <c>REPORTING_MODULE.md</c> "Known Data-Model Gaps").
/// </summary>
public class FinancialOrdersReportProvider : IReportDataProvider
{
    private readonly IGenericRepository<Order> _orderRepo;
    private readonly ICurrentUserService _currentUserService;

    public FinancialOrdersReportProvider(IGenericRepository<Order> orderRepo, ICurrentUserService currentUserService)
    {
        _orderRepo = orderRepo;
        _currentUserService = currentUserService;
    }

    public string Key => "financial-orders";
    public string Category => "Financial Reports";
    public string Title => "Financial Report (Store Orders & Revenue)";
    public string Description => "Revenue and order-volume analysis from school-store purchases — the real transactional ledger this system maintains (there is no separate tuition/fee module; see report description for scope).";
    public IReadOnlyList<string> AllowedRoles { get; } = new[] { "admin", "principal" };

    public IReadOnlyList<ReportColumnDefinition> Columns { get; } = new List<ReportColumnDefinition>
    {
        ReportColumnDefinition.Text("order_number", "Order #", 130),
        ReportColumnDefinition.Date("date", "Date", 120),
        ReportColumnDefinition.Text("school_name", "School", 170),
        ReportColumnDefinition.Text("student_name", "Student", 180),
        ReportColumnDefinition.Currency("subtotal", "Subtotal", 110),
        ReportColumnDefinition.Currency("delivery_charges", "Delivery", 100),
        ReportColumnDefinition.Currency("total_amount", "Total", 110),
        ReportColumnDefinition.Text("status", "Status", 130),
    };

    public async Task<ReportDataResult> GetDataAsync(ReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        var (start, end) = filter.ResolveDateRange();

        var orders = await _orderRepo.GetAllAsync(q =>
        {
            IQueryable<Order> query = q;
            if (filter.SchoolId.HasValue) query = query.Where(o => o.SchoolId == filter.SchoolId.Value);
            if (filter.StudentId.HasValue) query = query.Where(o => o.StudentId == filter.StudentId.Value);
            if (start.HasValue) query = query.Where(o => o.CreatedAt >= start.Value);
            if (end.HasValue) query = query.Where(o => o.CreatedAt <= end.Value);
            if (!string.IsNullOrWhiteSpace(filter.Status)) query = query.Where(o => o.Status == filter.Status);

            return query;
        });

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim();
            orders = orders.Where(o =>
                ReportProviderHelpers.ContainsIgnoreCase(o.OrderNumber, term) ||
                ReportProviderHelpers.ContainsIgnoreCase(o.StudentName, term) ||
                ReportProviderHelpers.ContainsIgnoreCase(o.SchoolName, term)).ToList();
        }

        var keySelectors = new Dictionary<string, Func<Order, IComparable?>>(StringComparer.OrdinalIgnoreCase)
        {
            ["order_number"] = o => o.OrderNumber,
            ["date"] = o => o.CreatedAt,
            ["total_amount"] = o => o.TotalAmount,
            ["status"] = o => o.Status,
        };

        var page = ReportProviderHelpers.SortAndPage(orders, filter, keySelectors, "date", out var totalCount);

        var rows = page.Select(o => new Dictionary<string, object?>
        {
            ["order_number"] = o.OrderNumber,
            ["date"] = o.CreatedAt,
            ["school_name"] = o.SchoolName,
            ["student_name"] = o.StudentName,
            ["subtotal"] = o.Subtotal,
            ["delivery_charges"] = o.DeliveryCharges,
            ["total_amount"] = o.TotalAmount,
            ["status"] = o.Status,
        }).ToList();

        var totalRevenue = orders.Sum(o => o.TotalAmount);
        var avgOrderValue = orders.Count == 0 ? 0m : Math.Round(totalRevenue / orders.Count, 2);
        var trendBuckets = ReportProviderHelpers.LastNMonthBuckets(6, end ?? DateTime.UtcNow);
        var revenueByMonth = trendBuckets.Select(b => orders.Where(o => o.CreatedAt >= b.Start && o.CreatedAt <= b.End).Sum(o => o.TotalAmount)).ToList();

        return new ReportDataResult
        {
            Rows = rows,
            TotalCount = totalCount,
            Kpis = new List<ReportKpiDto>
            {
                ReportKpiDto.Number("total_orders", "Total Orders", orders.Count, "ShoppingCart"),
                ReportKpiDto.Currency("total_revenue", "Total Revenue", totalRevenue, "DollarSign"),
                ReportKpiDto.Currency("avg_order_value", "Average Order Value", avgOrderValue, "Receipt"),
            },
            Charts = new List<ReportChartDto>
            {
                ReportChartDto.Single("revenue_trend", "Revenue Trend (last 6 months)", ReportChartType.Line,
                    trendBuckets.Select(b => b.Label), "Revenue", revenueByMonth, "Currency")
            },
            SummaryNote = $"{rows.Count} of {totalCount} orders shown — total revenue {totalRevenue:N2} for the selected scope."
        };
    }
}

/// <summary>
/// "Audit Reports" — backed by <see cref="EventAuditLog"/>, the only audit
/// trail this schema persists (event-management actions: create/update/cancel/
/// approve registrations etc.). The report is named and described to reflect
/// that scope honestly rather than implying a system-wide audit ledger that
/// doesn't exist (see <c>REPORTING_MODULE.md</c> "Known Data-Model Gaps" for
/// the documented follow-up: a general-purpose <c>AuditLog</c> covering every
/// module, mirroring this one's shape).
/// </summary>
public class AuditActivityLogReportProvider : IReportDataProvider
{
    private readonly IGenericRepository<EventAuditLog> _auditRepo;
    private readonly ICurrentUserService _currentUserService;

    public AuditActivityLogReportProvider(IGenericRepository<EventAuditLog> auditRepo, ICurrentUserService currentUserService)
    {
        _auditRepo = auditRepo;
        _currentUserService = currentUserService;
    }

    public string Key => "audit-activity-log";
    public string Category => "Audit Reports";
    public string Title => "Audit Log Report (Event Management)";
    public string Description => "Who did what and when, for event-management actions — this system's persisted audit trail (event create/update/cancel/registration actions). See description for current scope.";
    public IReadOnlyList<string> AllowedRoles { get; } = new[] { "admin", "principal" };

    public IReadOnlyList<ReportColumnDefinition> Columns { get; } = new List<ReportColumnDefinition>
    {
        ReportColumnDefinition.DateTime("date_time", "Timestamp", 170),
        ReportColumnDefinition.Text("user_name", "User", 180),
        ReportColumnDefinition.Text("role", "Role", 110),
        ReportColumnDefinition.Text("action_performed", "Action", 320),
        ReportColumnDefinition.Text("school_name", "School", 170),
    };

    public async Task<ReportDataResult> GetDataAsync(ReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        var (start, end) = filter.ResolveDateRange();

        var logs = await _auditRepo.GetAllAsync(q =>
        {
            IQueryable<EventAuditLog> query = q;
            if (filter.SchoolId.HasValue) query = query.Where(a => a.SchoolId == filter.SchoolId.Value);
            if (start.HasValue) query = query.Where(a => a.DateTime >= start.Value);
            if (end.HasValue) query = query.Where(a => a.DateTime <= end.Value);
            if (!string.IsNullOrWhiteSpace(filter.Status)) query = query.Where(a => a.Role == filter.Status);

            return query.Include(a => a.School);
        });

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim();
            logs = logs.Where(a =>
                ReportProviderHelpers.ContainsIgnoreCase(a.UserName, term) ||
                ReportProviderHelpers.ContainsIgnoreCase(a.ActionPerformed, term)).ToList();
        }

        var keySelectors = new Dictionary<string, Func<EventAuditLog, IComparable?>>(StringComparer.OrdinalIgnoreCase)
        {
            ["date_time"] = a => a.DateTime,
            ["user_name"] = a => a.UserName,
            ["role"] = a => a.Role,
        };

        var page = ReportProviderHelpers.SortAndPage(logs, filter, keySelectors, "date_time", out var totalCount);

        var rows = page.Select(a => new Dictionary<string, object?>
        {
            ["date_time"] = a.DateTime,
            ["user_name"] = a.UserName,
            ["role"] = a.Role,
            ["action_performed"] = a.ActionPerformed,
            ["school_name"] = a.School?.Name,
        }).ToList();

        var byRole = logs.GroupBy(a => a.Role).Select(g => new { g.Key, Count = g.Count() }).OrderByDescending(g => g.Count).ToList();
        var distinctUsers = logs.Select(a => a.UserName).Distinct().Count();

        return new ReportDataResult
        {
            Rows = rows,
            TotalCount = totalCount,
            Kpis = new List<ReportKpiDto>
            {
                ReportKpiDto.Number("total_actions", "Logged Actions", logs.Count, "ScrollText"),
                ReportKpiDto.Number("distinct_users", "Distinct Users", distinctUsers, "Users"),
                ReportKpiDto.Number("roles_active", "Roles Active", byRole.Count, "Shield"),
            },
            Charts = new List<ReportChartDto>
            {
                ReportChartDto.Single("actions_by_role", "Logged Actions by Role", ReportChartType.Pie,
                    byRole.Select(g => g.Key), "Actions", byRole.Select(g => (decimal)g.Count), "Actions")
            },
            SummaryNote = $"{rows.Count} of {totalCount} audit entries shown — {distinctUsers} distinct users acted in range."
        };
    }
}

/// <summary>
/// "Activity Reports" — general user-activity view derived from <see cref="User.LastLoginAt"/>
/// and account status (the closest real signal to "system activity" this schema
/// persists outside the event-scoped audit log above). Rows are one-per-user
/// account, scoped by school and role-aware visibility.
/// </summary>
public class UserActivityReportProvider : IReportDataProvider
{
    private readonly IGenericRepository<User> _userRepo;
    private readonly ICurrentUserService _currentUserService;

    public UserActivityReportProvider(IGenericRepository<User> userRepo, ICurrentUserService currentUserService)
    {
        _userRepo = userRepo;
        _currentUserService = currentUserService;
    }

    public string Key => "user-activity";
    public string Category => "Activity Reports";
    public string Title => "User Activity Report";
    public string Description => "Account-level activity: role, school, last-login time, and active status — derived from real account/login data.";
    public IReadOnlyList<string> AllowedRoles { get; } = new[] { "admin", "principal" };

    public IReadOnlyList<ReportColumnDefinition> Columns { get; } = new List<ReportColumnDefinition>
    {
        ReportColumnDefinition.Text("full_name", "User", 200),
        ReportColumnDefinition.Text("role_name", "Role", 110),
        ReportColumnDefinition.Text("school_name", "School", 170),
        ReportColumnDefinition.Text("email", "Email", 220),
        ReportColumnDefinition.DateTime("last_login_at", "Last Login", 170),
        ReportColumnDefinition.Boolean("is_active", "Active", 90),
    };

    public async Task<ReportDataResult> GetDataAsync(ReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        var (start, end) = filter.ResolveDateRange();

        var users = await _userRepo.GetAllAsync(q =>
        {
            IQueryable<User> query = q;
            if (filter.SchoolId.HasValue) query = query.Where(u => u.SchoolId == filter.SchoolId.Value);
            if (!string.IsNullOrWhiteSpace(filter.Status))
            {
                if (string.Equals(filter.Status, "active", StringComparison.OrdinalIgnoreCase)) query = query.Where(u => u.IsActive);
                else if (string.Equals(filter.Status, "inactive", StringComparison.OrdinalIgnoreCase)) query = query.Where(u => !u.IsActive);
                else query = query.Where(u => u.Role.RoleName == filter.Status);
            }
            if (start.HasValue) query = query.Where(u => u.LastLoginAt == null || u.LastLoginAt >= start.Value);
            if (end.HasValue) query = query.Where(u => u.LastLoginAt == null || u.LastLoginAt <= end.Value);

            return query.Include(u => u.School).Include(u => u.Role);
        });

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim();
            users = users.Where(u =>
                ReportProviderHelpers.ContainsIgnoreCase(ReportProviderHelpers.FullName(u.FirstName, u.LastName), term) ||
                ReportProviderHelpers.ContainsIgnoreCase(u.Email, term)).ToList();
        }

        var keySelectors = new Dictionary<string, Func<User, IComparable?>>(StringComparer.OrdinalIgnoreCase)
        {
            ["full_name"] = u => ReportProviderHelpers.FullName(u.FirstName, u.LastName),
            ["role_name"] = u => u.Role?.RoleName,
            ["last_login_at"] = u => u.LastLoginAt,
            ["is_active"] = u => u.IsActive,
        };

        var page = ReportProviderHelpers.SortAndPage(users, filter, keySelectors, "last_login_at", out var totalCount);

        var rows = page.Select(u => new Dictionary<string, object?>
        {
            ["full_name"] = ReportProviderHelpers.FullName(u.FirstName, u.LastName),
            ["role_name"] = u.Role?.RoleName,
            ["school_name"] = u.School?.Name,
            ["email"] = u.Email,
            ["last_login_at"] = u.LastLoginAt,
            ["is_active"] = u.IsActive,
        }).ToList();

        var activeCount = users.Count(u => u.IsActive);
        var loggedInLast30 = users.Count(u => u.LastLoginAt.HasValue && u.LastLoginAt.Value >= DateTime.UtcNow.AddDays(-30));
        var byRole = users.GroupBy(u => u.Role?.RoleName ?? "Unknown").Select(g => new { g.Key, Count = g.Count() }).OrderByDescending(g => g.Count).ToList();

        return new ReportDataResult
        {
            Rows = rows,
            TotalCount = totalCount,
            Kpis = new List<ReportKpiDto>
            {
                ReportKpiDto.Number("total_accounts", "Total Accounts", users.Count, "Users"),
                ReportKpiDto.Number("active_accounts", "Active Accounts", activeCount, "UserCheck"),
                ReportKpiDto.Number("logged_in_30d", "Logged In (30d)", loggedInLast30, "LogIn"),
            },
            Charts = new List<ReportChartDto>
            {
                ReportChartDto.Single("accounts_by_role", "Accounts by Role", ReportChartType.Donut,
                    byRole.Select(g => g.Key), "Accounts", byRole.Select(g => (decimal)g.Count), "Accounts")
            },
            SummaryNote = $"{rows.Count} of {totalCount} accounts shown — {loggedInLast30} active in the last 30 days."
        };
    }
}

/// <summary>
/// "Custom Reports" — the directive's open-ended "build your own report" slot.
/// Rather than build a full ad-hoc query designer (a multi-week project on its
/// own and explicitly out of scope for "do not create separate report
/// engines"), this ships ONE genuinely useful, fully-filterable custom report —
/// a cross-cutting student directory that combines fields from several domains
/// (enrollment + attendance % + performance % in one row) that no single
/// built-in report currently joins — and documents, in REPORTING_MODULE.md,
/// the registry-based extension path for adding more "custom" presets, which
/// is identical to adding any other report (one more <see cref="IReportDataProvider"/>).
/// </summary>
public class CustomStudentDirectoryReportProvider : IReportDataProvider
{
    private readonly IGenericRepository<Student> _studentRepo;
    private readonly IGenericRepository<Attendance> _attendanceRepo;
    private readonly IGenericRepository<Result> _resultRepo;
    private readonly ICurrentUserService _currentUserService;

    public CustomStudentDirectoryReportProvider(
        IGenericRepository<Student> studentRepo,
        IGenericRepository<Attendance> attendanceRepo,
        IGenericRepository<Result> resultRepo,
        ICurrentUserService currentUserService)
    {
        _studentRepo = studentRepo;
        _attendanceRepo = attendanceRepo;
        _resultRepo = resultRepo;
        _currentUserService = currentUserService;
    }

    public string Key => "custom-student-directory";
    public string Category => "Custom Reports";
    public string Title => "Custom Report: Student 360 Directory";
    public string Description => "A combined view joining enrollment, attendance %, and performance % in one row per student — a cross-cutting slice no single built-in report currently provides. Additional custom presets register the same way (see REPORTING_MODULE.md).";
    public IReadOnlyList<string> AllowedRoles { get; } = new[] { "admin", "principal", "staff" };

    public IReadOnlyList<ReportColumnDefinition> Columns { get; } = new List<ReportColumnDefinition>
    {
        ReportColumnDefinition.Text("student_id", "Student ID", 120),
        ReportColumnDefinition.Text("full_name", "Full Name", 190),
        ReportColumnDefinition.Text("school_name", "School", 170),
        ReportColumnDefinition.Text("grade_name", "Grade", 110),
        ReportColumnDefinition.Boolean("is_active", "Active", 80),
        ReportColumnDefinition.Percent("attendance_rate", "Attendance %", 130),
        ReportColumnDefinition.Percent("performance_rate", "Performance %", 130),
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

            return query.Include(s => s.School).Include(s => s.Grade);
        });

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim();
            students = students.Where(s =>
                ReportProviderHelpers.ContainsIgnoreCase(ReportProviderHelpers.FullName(s.FirstName, s.LastName), term) ||
                ReportProviderHelpers.ContainsIgnoreCase(s.StudentId, term)).ToList();
        }

        var studentIds = students.Select(s => s.Id).ToList();
        var attendance = studentIds.Count == 0 ? new List<Attendance>() : await _attendanceRepo.GetAllAsync(q => q.Where(a => a.StudentId != null && studentIds.Contains(a.StudentId.Value)));
        var results = studentIds.Count == 0 ? new List<Result>() : await _resultRepo.GetAllAsync(q => q.Where(r => r.IsPublished && studentIds.Contains(r.StudentId)).Include(r => r.Exam));

        var attendanceByStudent = attendance.GroupBy(a => a.StudentId!.Value).ToDictionary(g => g.Key, g => g.ToList());
        var resultsByStudent = results.GroupBy(r => r.StudentId).ToDictionary(g => g.Key, g => g.ToList());

        var computed = students.Select(s =>
        {
            var att = attendanceByStudent.GetValueOrDefault(s.Id) ?? new List<Attendance>();
            var attRate = ReportProviderHelpers.SafePercentage(att.Count(a => a.Status == AttendanceStatus.Present || a.Status == AttendanceStatus.Late), att.Count);

            var res = resultsByStudent.GetValueOrDefault(s.Id) ?? new List<Result>();
            var perfRate = res.Count == 0
                ? 0m
                : Math.Round(res.Where(r => r.Exam?.TotalMarks is > 0).Select(r => (decimal)r.ObtainedMarks / r.Exam!.TotalMarks!.Value * 100m).DefaultIfEmpty(0m).Average(), 1);

            return new { Student = s, AttendanceRate = attRate, PerformanceRate = perfRate };
        }).ToList();

        var ordered = (filter.SortBy?.ToLowerInvariant()) switch
        {
            "attendance_rate" => computed.OrderBy(c => c.AttendanceRate).ToList(),
            "performance_rate" => computed.OrderBy(c => c.PerformanceRate).ToList(),
            "student_id" => computed.OrderBy(c => c.Student.StudentId).ToList(),
            _ => computed.OrderBy(c => ReportProviderHelpers.FullName(c.Student.FirstName, c.Student.LastName)).ToList(),
        };
        if (string.Equals(filter.SortDirection, "desc", StringComparison.OrdinalIgnoreCase)) ordered.Reverse();

        var totalCount = ordered.Count;
        var page = filter.Page < 1 ? 1 : filter.Page;
        var pageSize = filter.PageSize <= 0 ? 25 : filter.PageSize;
        var pageItems = ordered.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        var rows = pageItems.Select(c => new Dictionary<string, object?>
        {
            ["student_id"] = c.Student.StudentId,
            ["full_name"] = ReportProviderHelpers.FullName(c.Student.FirstName, c.Student.LastName),
            ["school_name"] = c.Student.School?.Name,
            ["grade_name"] = c.Student.Grade?.GradeName,
            ["is_active"] = c.Student.IsActive,
            ["attendance_rate"] = c.AttendanceRate,
            ["performance_rate"] = c.PerformanceRate,
        }).ToList();

        var avgAttendance = computed.Count == 0 ? 0m : Math.Round(computed.Average(c => c.AttendanceRate), 1);
        var avgPerformance = computed.Count == 0 ? 0m : Math.Round(computed.Average(c => c.PerformanceRate), 1);

        return new ReportDataResult
        {
            Rows = rows,
            TotalCount = totalCount,
            Kpis = new List<ReportKpiDto>
            {
                ReportKpiDto.Number("total_students", "Students", computed.Count, "Users"),
                ReportKpiDto.Percent("avg_attendance", "Average Attendance %", avgAttendance, "CalendarCheck"),
                ReportKpiDto.Percent("avg_performance", "Average Performance %", avgPerformance, "TrendingUp"),
            },
            Charts = new List<ReportChartDto>
            {
                new ReportChartDto
                {
                    Key = "attendance_vs_performance",
                    Title = "Attendance % vs Performance % (cohort average)",
                    Type = ReportChartType.Bar,
                    Labels = new List<string> { "Attendance %", "Performance %" },
                    Series = new List<ReportChartSeriesDto> { new() { Name = "Average", Data = new List<decimal> { avgAttendance, avgPerformance } } }
                }
            },
            SummaryNote = $"{rows.Count} of {totalCount} students shown — combined enrollment/attendance/performance view."
        };
    }
}
