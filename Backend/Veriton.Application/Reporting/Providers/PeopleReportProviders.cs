using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
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
/// "Parent Reports" — built on the SAME phone-number-matched parent/child
/// linkage <see cref="Veriton.Application.Services.ParentService"/> already
/// uses (there is no formal Parent entity in this schema; see that service's
/// doc for why). Rows are one-per-child so a parent with multiple children at
/// the school sees each child's progress individually.
/// </summary>
public class ParentChildProgressReportProvider : IReportDataProvider
{
    private readonly IGenericRepository<Student> _studentRepo;
    private readonly IGenericRepository<LessonCompletion> _completionRepo;
    private readonly IGenericRepository<Lesson> _lessonRepo;
    private readonly ICurrentUserService _currentUserService;

    public ParentChildProgressReportProvider(
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

    public string Key => "parent-child-progress";
    public string Category => "Parent Reports";
    public string Title => "Child Progress Report";
    public string Description => "Each child's enrollment, lesson-completion %, and attendance at a glance — the parent-facing learning-progress view.";
    public IReadOnlyList<string> AllowedRoles { get; } = new[] { "admin", "principal", "staff", "parent" };

    public IReadOnlyList<ReportColumnDefinition> Columns { get; } = new List<ReportColumnDefinition>
    {
        ReportColumnDefinition.Text("student_name", "Child", 200),
        ReportColumnDefinition.Text("school_name", "School", 180),
        ReportColumnDefinition.Text("grade_name", "Grade", 110),
        ReportColumnDefinition.Text("parent_guardian_name", "Parent / Guardian", 180),
        ReportColumnDefinition.Number("completed_lessons", "Lessons Completed", 130),
        ReportColumnDefinition.Number("total_lessons", "Total Lessons", 110),
        ReportColumnDefinition.Percent("completion_rate", "Progress %", 110),
    };

    public async Task<ReportDataResult> GetDataAsync(ReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        var students = await _studentRepo.GetAllAsync(q =>
        {
            IQueryable<Student> query = q;
            if (filter.SchoolId.HasValue) query = query.Where(s => s.SchoolId == filter.SchoolId.Value);
            if (filter.GradeId.HasValue) query = query.Where(s => s.GradeId == filter.GradeId.Value);
            if (filter.StudentId.HasValue) query = query.Where(s => s.Id == filter.StudentId.Value);
            return query.Include(s => s.School).Include(s => s.Grade);
        });

        // Parents browse only their own children — same phone-matching IParentService relies on.
        if (string.Equals(_currentUserService.Role, "parent", StringComparison.OrdinalIgnoreCase))
        {
            var parentPhone = _currentUserService.User?.FindFirst("phone")?.Value
                ?? _currentUserService.User?.FindFirst(ClaimTypes.MobilePhone)?.Value;
            if (!string.IsNullOrWhiteSpace(parentPhone))
            {
                students = students.Where(s => string.Equals(s.ParentGuardianPhone, parentPhone, StringComparison.OrdinalIgnoreCase)).ToList();
            }
            else
            {
                students = new List<Student>();
            }
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim();
            students = students.Where(s =>
                ReportProviderHelpers.ContainsIgnoreCase(ReportProviderHelpers.FullName(s.FirstName, s.LastName), term) ||
                ReportProviderHelpers.ContainsIgnoreCase(s.ParentGuardianName, term)).ToList();
        }

        var studentIds = students.Select(s => s.Id).ToList();
        var completions = studentIds.Count == 0
            ? new List<LessonCompletion>()
            : await _completionRepo.GetAllAsync(q => q.Where(c => studentIds.Contains(c.StudentId)).Include(c => c.Lesson));

        var completionsByStudent = completions.GroupBy(c => c.StudentId).ToDictionary(g => g.Key, g => g.Count());

        // Total lesson count is per-grade-level (lessons belong to modules belonging to
        // the school-agnostic master GradeLevel now — Grade no longer has a Modules nav).
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

        var keySelectors = new Dictionary<string, Func<Student, IComparable?>>(StringComparer.OrdinalIgnoreCase)
        {
            ["student_name"] = s => ReportProviderHelpers.FullName(s.FirstName, s.LastName),
            ["grade_name"] = s => s.Grade?.GradeName,
        };

        var page = ReportProviderHelpers.SortAndPage(students, filter, keySelectors, "student_name", out var totalCount);

        var rows = page.Select(s =>
        {
            var completed = completionsByStudent.GetValueOrDefault(s.Id);
            var total = s.Grade?.GradeLevelId is Guid glId ? lessonCountByGradeLevel.GetValueOrDefault(glId) : 0;
            return new Dictionary<string, object?>
            {
                ["student_name"] = ReportProviderHelpers.FullName(s.FirstName, s.LastName),
                ["school_name"] = s.School?.Name,
                ["grade_name"] = s.Grade?.GradeName,
                ["parent_guardian_name"] = s.ParentGuardianName,
                ["completed_lessons"] = completed,
                ["total_lessons"] = total,
                ["completion_rate"] = ReportProviderHelpers.SafePercentage(completed, total),
            };
        }).ToList();

        var avgProgress = rows.Count == 0 ? 0m : Math.Round(rows.Average(r => (decimal)(r["completion_rate"] as decimal? ?? 0m)), 1);

        return new ReportDataResult
        {
            Rows = rows,
            TotalCount = totalCount,
            Kpis = new List<ReportKpiDto>
            {
                ReportKpiDto.Number("children_count", "Children Shown", students.Count, "Users"),
                ReportKpiDto.Percent("avg_progress", "Average Progress %", avgProgress, "TrendingUp"),
            },
            Charts = new List<ReportChartDto>
            {
                ReportChartDto.Single("progress_by_child", "Progress % by Child", ReportChartType.Bar,
                    rows.Select(r => (string)(r["student_name"] ?? "")), "Progress %",
                    rows.Select(r => (decimal)(r["completion_rate"] as decimal? ?? 0m)), "%")
            },
            SummaryNote = $"{rows.Count} of {totalCount} children shown — {avgProgress}% average progress."
        };
    }
}

/// <summary>"Teacher Reports" — workload view: classes/subjects assigned, lesson and exam authorship counts, scoped to the teacher's own data when the caller IS a teacher.</summary>
public class TeacherWorkloadReportProvider : IReportDataProvider
{
    private readonly IGenericRepository<Teacher> _teacherRepo;
    private readonly IGenericRepository<Grade> _gradeRepo;
    private readonly ICurrentUserService _currentUserService;

    public TeacherWorkloadReportProvider(
        IGenericRepository<Teacher> teacherRepo,
        IGenericRepository<Grade> gradeRepo,
        ICurrentUserService currentUserService)
    {
        _teacherRepo = teacherRepo;
        _gradeRepo = gradeRepo;
        _currentUserService = currentUserService;
    }

    public string Key => "teacher-workload";
    public string Category => "Teacher Reports";
    public string Title => "Teacher Workload Report";
    public string Description => "Per-teacher view of assigned grades, subjects/modules, lessons authored, and scheduled classes.";
    public IReadOnlyList<string> AllowedRoles { get; } = new[] { "principal", "staff", "teacher" };

    public IReadOnlyList<ReportColumnDefinition> Columns { get; } = new List<ReportColumnDefinition>
    {
        ReportColumnDefinition.Text("employee_id", "Employee ID", 120),
        ReportColumnDefinition.Text("full_name", "Teacher", 200),
        ReportColumnDefinition.Text("school_name", "School", 170),
        ReportColumnDefinition.Text("specialization", "Specialization", 170),
        ReportColumnDefinition.Number("modules_count", "Subjects", 100),
        ReportColumnDefinition.Number("lessons_count", "Lessons Authored", 130),
        ReportColumnDefinition.Number("schedules_count", "Scheduled Classes", 140),
        ReportColumnDefinition.Number("exams_count", "Exams Authored", 120),
        ReportColumnDefinition.Boolean("is_active", "Active", 90),
    };

    public async Task<ReportDataResult> GetDataAsync(ReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        var teachers = await _teacherRepo.GetAllAsync(q =>
        {
            IQueryable<Teacher> query = q;
            if (filter.SchoolId.HasValue) query = query.Where(t => t.SchoolId == filter.SchoolId.Value);
            if (filter.TeacherId.HasValue) query = query.Where(t => t.Id == filter.TeacherId.Value);

            if (string.Equals(filter.Status, "active", StringComparison.OrdinalIgnoreCase)) query = query.Where(t => t.IsActive);
            else if (string.Equals(filter.Status, "inactive", StringComparison.OrdinalIgnoreCase)) query = query.Where(t => !t.IsActive);

            return query
                .Include(t => t.School)
                .Include(t => t.Modules)
                .Include(t => t.Lessons)
                .Include(t => t.Schedules)
                .Include(t => t.Exams);
        });

        if (filter.GradeId.HasValue)
        {
            // Units (t.Modules) are keyed by the school-agnostic master GradeLevelId now,
            // not a per-school Grade.Id — translate the filter's Grade.Id to its
            // GradeLevelId before comparing against Module.GradeLevelId.
            var filterGradeLevelId = (await _gradeRepo.GetByIdAsync(filter.GradeId.Value))?.GradeLevelId;

            teachers = teachers.Where(t => t.ClassTeacherGrades.Any(g => g.Id == filter.GradeId.Value)
                || (filterGradeLevelId.HasValue && t.Modules.Any(m => m.GradeLevelId == filterGradeLevelId.Value))).ToList();
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim();
            teachers = teachers.Where(t =>
                ReportProviderHelpers.ContainsIgnoreCase(ReportProviderHelpers.FullName(t.FirstName, t.LastName), term) ||
                ReportProviderHelpers.ContainsIgnoreCase(t.EmployeeId, term) ||
                ReportProviderHelpers.ContainsIgnoreCase(t.Specialization, term)).ToList();
        }

        var keySelectors = new Dictionary<string, Func<Teacher, IComparable?>>(StringComparer.OrdinalIgnoreCase)
        {
            ["full_name"] = t => ReportProviderHelpers.FullName(t.FirstName, t.LastName),
            ["employee_id"] = t => t.EmployeeId,
            ["modules_count"] = t => t.Modules.Count,
            ["lessons_count"] = t => t.Lessons.Count,
        };

        var page = ReportProviderHelpers.SortAndPage(teachers, filter, keySelectors, "full_name", out var totalCount);

        var rows = page.Select(t => new Dictionary<string, object?>
        {
            ["employee_id"] = t.EmployeeId,
            ["full_name"] = ReportProviderHelpers.FullName(t.FirstName, t.LastName),
            ["school_name"] = t.School?.Name,
            ["specialization"] = t.Specialization,
            ["modules_count"] = t.Modules.Count,
            ["lessons_count"] = t.Lessons.Count,
            ["schedules_count"] = t.Schedules.Count,
            ["exams_count"] = t.Exams.Count,
            ["is_active"] = t.IsActive,
        }).ToList();

        var topByLessons = teachers
            .OrderByDescending(t => t.Lessons.Count)
            .Take(8)
            .ToList();

        return new ReportDataResult
        {
            Rows = rows,
            TotalCount = totalCount,
            Kpis = new List<ReportKpiDto>
            {
                ReportKpiDto.Number("total_teachers", "Total Teachers", teachers.Count, "Users"),
                ReportKpiDto.Number("active_teachers", "Active Teachers", teachers.Count(t => t.IsActive), "UserCheck"),
                ReportKpiDto.Number("total_lessons_authored", "Lessons Authored", teachers.Sum(t => t.Lessons.Count), "BookOpen"),
                ReportKpiDto.Number("total_scheduled_classes", "Scheduled Classes", teachers.Sum(t => t.Schedules.Count), "CalendarClock"),
            },
            Charts = new List<ReportChartDto>
            {
                ReportChartDto.Single("workload_by_teacher", "Lessons Authored by Teacher", ReportChartType.Bar,
                    topByLessons.Select(t => ReportProviderHelpers.FullName(t.FirstName, t.LastName)), "Lessons",
                    topByLessons.Select(t => (decimal)t.Lessons.Count), "Lessons")
            },
            SummaryNote = $"{rows.Count} of {totalCount} teachers shown."
        };
    }
}

/// <summary>
/// "Staff Reports" — Staff has no dedicated entity in this schema; staff are
/// <see cref="User"/> records whose <see cref="Role"/> is "Staff" (mirrors how
/// Principal is modelled — see <see cref="PrincipalSchoolOverviewReportProvider"/>
/// and <c>GenericSchoolService</c>'s own "Principal" role lookups). This is a
/// directory/roster view, not a workload view, since Staff don't carry the
/// Teacher entity's lesson/exam-authorship relations.
/// </summary>
public class StaffDirectoryReportProvider : IReportDataProvider
{
    private readonly IGenericRepository<User> _userRepo;
    private readonly ICurrentUserService _currentUserService;

    public StaffDirectoryReportProvider(IGenericRepository<User> userRepo, ICurrentUserService currentUserService)
    {
        _userRepo = userRepo;
        _currentUserService = currentUserService;
    }

    public string Key => "staff-directory";
    public string Category => "Staff Reports";
    public string Title => "Staff Directory Report";
    public string Description => "Roster of staff-role accounts with school, contact details, and active status.";
    public IReadOnlyList<string> AllowedRoles { get; } = new[] { "principal", "staff" };

    public IReadOnlyList<ReportColumnDefinition> Columns { get; } = new List<ReportColumnDefinition>
    {
        ReportColumnDefinition.Text("full_name", "Name", 200),
        ReportColumnDefinition.Text("email", "Email", 220),
        ReportColumnDefinition.Text("phone", "Phone", 140),
        ReportColumnDefinition.Text("school_name", "School", 180),
        ReportColumnDefinition.Date("created_at", "Joined", 130),
        ReportColumnDefinition.Boolean("is_active", "Active", 90),
    };

    public async Task<ReportDataResult> GetDataAsync(ReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        var users = await _userRepo.GetAllAsync(q =>
        {
            IQueryable<User> query = q.Where(u => u.Role.RoleName == "Staff");
            if (filter.SchoolId.HasValue) query = query.Where(u => u.SchoolId == filter.SchoolId.Value);

            if (string.Equals(filter.Status, "active", StringComparison.OrdinalIgnoreCase)) query = query.Where(u => u.IsActive);
            else if (string.Equals(filter.Status, "inactive", StringComparison.OrdinalIgnoreCase)) query = query.Where(u => !u.IsActive);

            return query.Include(u => u.School).Include(u => u.Role);
        });

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim();
            users = users.Where(u =>
                ReportProviderHelpers.ContainsIgnoreCase(ReportProviderHelpers.FullName(u.FirstName, u.LastName), term) ||
                ReportProviderHelpers.ContainsIgnoreCase(u.Email, term) ||
                ReportProviderHelpers.ContainsIgnoreCase(u.Phone, term)).ToList();
        }

        var keySelectors = new Dictionary<string, Func<User, IComparable?>>(StringComparer.OrdinalIgnoreCase)
        {
            ["full_name"] = u => ReportProviderHelpers.FullName(u.FirstName, u.LastName),
            ["email"] = u => u.Email,
            ["created_at"] = u => u.CreatedAt,
            ["is_active"] = u => u.IsActive,
        };

        var page = ReportProviderHelpers.SortAndPage(users, filter, keySelectors, "full_name", out var totalCount);

        var rows = page.Select(u => new Dictionary<string, object?>
        {
            ["full_name"] = ReportProviderHelpers.FullName(u.FirstName, u.LastName),
            ["email"] = u.Email,
            ["phone"] = u.Phone,
            ["school_name"] = u.School?.Name,
            ["created_at"] = u.CreatedAt,
            ["is_active"] = u.IsActive,
        }).ToList();

        var activeCount = users.Count(u => u.IsActive);
        var bySchool = users.GroupBy(u => u.School?.Name ?? "Unassigned").OrderByDescending(g => g.Count()).Take(10).ToList();

        return new ReportDataResult
        {
            Rows = rows,
            TotalCount = totalCount,
            Kpis = new List<ReportKpiDto>
            {
                ReportKpiDto.Number("total_staff", "Total Staff", users.Count, "Users"),
                ReportKpiDto.Number("active_staff", "Active Staff", activeCount, "UserCheck"),
                ReportKpiDto.Percent("active_rate", "Active %", ReportProviderHelpers.SafePercentage(activeCount, users.Count), "TrendingUp"),
            },
            Charts = new List<ReportChartDto>
            {
                ReportChartDto.Single("staff_by_school", "Staff by School", ReportChartType.Bar,
                    bySchool.Select(g => g.Key), "Staff", bySchool.Select(g => (decimal)g.Count()), "Staff")
            },
            SummaryNote = $"{rows.Count} of {totalCount} staff accounts shown."
        };
    }
}

/// <summary>
/// "Principal Reports" — school-level overview for the principal's own school
/// (or, for Admin, every school). Aggregates the same headcount figures
/// <c>DashboardService</c> already computes per school, presented as a
/// browsable/exportable/filterable report rather than a fixed dashboard tile.
/// </summary>
public class PrincipalSchoolOverviewReportProvider : IReportDataProvider
{
    private readonly IGenericRepository<School> _schoolRepo;
    private readonly IGenericRepository<Student> _studentRepo;
    private readonly IGenericRepository<Teacher> _teacherRepo;
    private readonly IGenericRepository<User> _userRepo;
    private readonly ICurrentUserService _currentUserService;

    public PrincipalSchoolOverviewReportProvider(
        IGenericRepository<School> schoolRepo,
        IGenericRepository<Student> studentRepo,
        IGenericRepository<Teacher> teacherRepo,
        IGenericRepository<User> userRepo,
        ICurrentUserService currentUserService)
    {
        _schoolRepo = schoolRepo;
        _studentRepo = studentRepo;
        _teacherRepo = teacherRepo;
        _userRepo = userRepo;
        _currentUserService = currentUserService;
    }

    public string Key => "principal-school-overview";
    public string Category => "Principal Reports";
    public string Title => "School Overview Report";
    public string Description => "One row per school: enrolled students, teachers, staff, and active grades — the principal's school-wide snapshot.";
    public IReadOnlyList<string> AllowedRoles { get; } = new[] { "principal" };

    public IReadOnlyList<ReportColumnDefinition> Columns { get; } = new List<ReportColumnDefinition>
    {
        ReportColumnDefinition.Text("school_name", "School", 220),
        ReportColumnDefinition.Number("students_count", "Students", 110),
        ReportColumnDefinition.Number("active_students_count", "Active Students", 130),
        ReportColumnDefinition.Number("teachers_count", "Teachers", 110),
        ReportColumnDefinition.Number("staff_count", "Staff", 100),
        ReportColumnDefinition.Number("grades_count", "Grades", 100),
    };

    public async Task<ReportDataResult> GetDataAsync(ReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        var schools = await _schoolRepo.GetAllAsync(q =>
        {
            IQueryable<School> query = q;
            if (filter.SchoolId.HasValue) query = query.Where(s => s.Id == filter.SchoolId.Value);
            return query.Include(s => s.Grades);
        });

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim();
            schools = schools.Where(s => ReportProviderHelpers.ContainsIgnoreCase(s.Name, term)).ToList();
        }

        var schoolIds = schools.Select(s => s.Id).ToList();

        var students = schoolIds.Count == 0 ? new List<Student>() : await _studentRepo.GetAllAsync(q => q.Where(s => schoolIds.Contains(s.SchoolId)));
        var teachers = schoolIds.Count == 0 ? new List<Teacher>() : await _teacherRepo.GetAllAsync(q => q.Where(t => schoolIds.Contains(t.SchoolId)));
        var staff = schoolIds.Count == 0 ? new List<User>() : await _userRepo.GetAllAsync(q => q.Where(u => u.Role.RoleName == "Staff" && u.SchoolId.HasValue && schoolIds.Contains(u.SchoolId.Value)));

        var keySelectors = new Dictionary<string, Func<School, IComparable?>>(StringComparer.OrdinalIgnoreCase)
        {
            ["school_name"] = s => s.Name,
            ["students_count"] = s => students.Count(st => st.SchoolId == s.Id),
        };

        var page = ReportProviderHelpers.SortAndPage(schools, filter, keySelectors, "school_name", out var totalCount);

        var rows = page.Select(s =>
        {
            var schoolStudents = students.Where(st => st.SchoolId == s.Id).ToList();
            return new Dictionary<string, object?>
            {
                ["school_name"] = s.Name,
                ["students_count"] = schoolStudents.Count,
                ["active_students_count"] = schoolStudents.Count(st => st.IsActive),
                ["teachers_count"] = teachers.Count(t => t.SchoolId == s.Id),
                ["staff_count"] = staff.Count(u => u.SchoolId == s.Id),
                ["grades_count"] = s.Grades.Count,
            };
        }).ToList();

        var byEnrollment = rows.OrderByDescending(r => (int)(r["students_count"] ?? 0)).Take(10).ToList();

        return new ReportDataResult
        {
            Rows = rows,
            TotalCount = totalCount,
            Kpis = new List<ReportKpiDto>
            {
                ReportKpiDto.Number("total_schools", "Schools", schools.Count, "Building2"),
                ReportKpiDto.Number("total_students", "Total Students", students.Count, "Users"),
                ReportKpiDto.Number("total_teachers", "Total Teachers", teachers.Count, "GraduationCap"),
                ReportKpiDto.Number("total_staff", "Total Staff", staff.Count, "Briefcase"),
            },
            Charts = new List<ReportChartDto>
            {
                ReportChartDto.Single("students_by_school", "Students by School", ReportChartType.Bar,
                    byEnrollment.Select(r => (string)(r["school_name"] ?? "")), "Students",
                    byEnrollment.Select(r => (decimal)(int)(r["students_count"] ?? 0)), "Students")
            },
            SummaryNote = $"{rows.Count} of {totalCount} schools shown."
        };
    }
}
