using Microsoft.EntityFrameworkCore;
using Veriton.Application.DTOs;
using Veriton.Application.Interfaces.Repositories;
using Veriton.Application.Interfaces.Services;
using Veriton.Domain.Entities;

namespace Veriton.Application.Services;

public class DashboardService : IDashboardService
{
    private readonly IGenericRepository<Student> _studentRepo;
    private readonly IGenericRepository<Teacher> _teacherRepo;
    private readonly IGenericRepository<Module> _moduleRepo;
    private readonly IGenericRepository<Lesson> _lessonRepo;
    private readonly IGenericRepository<Exam> _examRepo;
    private readonly IGenericRepository<Result> _resultRepo;
    private readonly IGenericRepository<School> _schoolRepo;
    private readonly IGenericRepository<Grade> _gradeRepo;
    private readonly IGenericRepository<LessonCompletion> _completionRepo;
    private readonly IGenericRepository<Attendance> _attendanceRepo;
    private readonly IUserRepository _userRepo;

    public DashboardService(
        IGenericRepository<Student> studentRepo,
        IGenericRepository<Teacher> teacherRepo,
        IGenericRepository<Module> moduleRepo,
        IGenericRepository<Lesson> lessonRepo,
        IGenericRepository<Exam> examRepo,
        IGenericRepository<Result> resultRepo,
        IGenericRepository<School> schoolRepo,
        IGenericRepository<Grade> gradeRepo,
        IGenericRepository<LessonCompletion> completionRepo,
        IGenericRepository<Attendance> attendanceRepo,
        IUserRepository userRepo)
    {
        _studentRepo = studentRepo;
        _teacherRepo = teacherRepo;
        _moduleRepo = moduleRepo;
        _lessonRepo = lessonRepo;
        _examRepo = examRepo;
        _resultRepo = resultRepo;
        _schoolRepo = schoolRepo;
        _gradeRepo = gradeRepo;
        _completionRepo = completionRepo;
        _attendanceRepo = attendanceRepo;
        _userRepo = userRepo;
    }

    public async Task<DashboardStatsDto> GetStatsAsync(Guid? schoolId = null, string? schoolFilter = null)
    {
        // ── All counts ONLY include active (IsActive = true) records ─────────
        // schoolId scoping: null = SuperAdmin sees all schools; non-null = scoped to one school.

        var stats = new DashboardStatsDto
        {
            // Active students only
            TotalStudents = await _studentRepo.CountAsync(q =>
                schoolId.HasValue
                    ? q.Where(s => s.IsActive && s.SchoolId == schoolId)
                    : q.Where(s => s.IsActive)),

            // Active teachers only
            TotalTeachers = await _teacherRepo.CountAsync(q =>
                schoolId.HasValue
                    ? q.Where(t => t.IsActive && t.SchoolId == schoolId)
                    : q.Where(t => t.IsActive)),

            // Active modules only — Units are master content, scoped to a school via
            // SchoolUnitAssignment now that Module no longer has its own SchoolId.
            TotalModules = await _moduleRepo.CountAsync(q =>
                schoolId.HasValue
                    ? q.Where(m => m.IsActive && m.SchoolAssignments.Any(a => !a.IsDeleted && a.SchoolId == schoolId))
                    : q.Where(m => m.IsActive)),

            // Active lessons only — Topics are master content, scoped to a school via
            // SchoolTopicAssignment now that Lesson no longer has its own SchoolId.
            TotalLessons = await _lessonRepo.CountAsync(q =>
                schoolId.HasValue
                    ? q.Where(l => l.IsActive && l.SchoolAssignments.Any(a => !a.IsDeleted && a.SchoolId == schoolId))
                    : q.Where(l => l.IsActive)),

            // Active exams only
            TotalExams = await _examRepo.CountAsync(q =>
                schoolId.HasValue
                    ? q.Where(e => e.IsActive && e.SchoolId == schoolId)
                    : q.Where(e => e.IsActive)),

            // All results (results don't have IsActive; count all for this school)
            TotalResults = await _resultRepo.CountAsync(q =>
                schoolId.HasValue
                    ? q.Where(r => r.SchoolId == schoolId)
                    : q),

            // Active schools only
            TotalSchools = schoolId.HasValue ? 1
                : await _schoolRepo.CountAsync(q => q.Where(s => s.IsActive)),

            // Active grades only
            TotalGrades = await _gradeRepo.CountAsync(q =>
                schoolId.HasValue
                    ? q.Where(g => g.IsActive && g.SchoolId == schoolId)
                    : q.Where(g => g.IsActive)),

            // Active principals
            TotalPrincipals = await _userRepo.CountAsync(q =>
                q.Where(u => u.Role.RoleName == "Principal"
                    && u.IsActive
                    && (!schoolId.HasValue || u.SchoolId == schoolId))),

            // Inactive principals = deactivated / pending re-activation
            TotalPrincipalsPending = await _userRepo.CountAsync(q =>
                q.Where(u => u.Role.RoleName == "Principal"
                    && !u.IsActive
                    && (!schoolId.HasValue || u.SchoolId == schoolId))),

            // Inactive teachers = pending approval / deactivated
            TotalTeachersPending = await _teacherRepo.CountAsync(q =>
                q.Where(t => !t.IsActive && (!schoolId.HasValue || t.SchoolId == schoolId))),

            // Inactive students = pending activation
            TotalStudentsPending = await _studentRepo.CountAsync(q =>
                q.Where(s => !s.IsActive && (!schoolId.HasValue || s.SchoolId == schoolId))),

            // Chart Data
            StudentProgress = await GetStudentProgressStatsAsync(schoolId),
            GradeAttendance = await GetGradeAttendanceStatsAsync(schoolId),
            TeacherStats    = await GetTeacherStatsAsync(schoolId)
        };

        // schoolFilter is intentionally NOT used to fake percentages.
        // The "Primary / Secondary" split UI filter was removed — all counts
        // reflect real database records. The frontend filter param is kept in
        // the signature for backward compat but is now a no-op.

        return stats;
    }

    private async Task<List<StudentProgressStatDto>> GetStudentProgressStatsAsync(Guid? schoolId)
    {
        var students = await _studentRepo.GetAllAsync(q => schoolId.HasValue ? q.Where(s => s.SchoolId == schoolId).OrderByDescending(s => s.CreatedAt).Take(5) : q.OrderByDescending(s => s.CreatedAt).Take(5));
        if (!students.Any())
        {
            return new List<StudentProgressStatDto>();
        }

        var studentIds = students.Select(s => s.Id).ToList();
        var gradeIds = students.Select(s => s.GradeId).Distinct().ToList();

        // Topics are now keyed by the master GradeLevelId rather than a student's
        // per-school Grade.Id — resolve each Grade row to its GradeLevelId first.
        var gradeLevelByGradeId = await _gradeRepo.Query()
            .Where(g => gradeIds.Contains(g.Id))
            .Select(g => new { g.Id, g.GradeLevelId })
            .ToListAsync();
        var gradeLevelLookup = gradeLevelByGradeId.ToDictionary(x => x.Id, x => x.GradeLevelId);
        var gradeLevelIds = gradeLevelByGradeId
            .Where(x => x.GradeLevelId.HasValue)
            .Select(x => x.GradeLevelId!.Value)
            .Distinct()
            .ToList();

        // Count lessons per GradeLevelId directly from database
        var lessonsCountByGradeLevel = await _lessonRepo.Query()
            .Where(l => gradeLevelIds.Contains(l.Module.GradeLevelId))
            .GroupBy(l => l.Module.GradeLevelId)
            .Select(g => new { GradeLevelId = g.Key, Count = g.Count() })
            .ToListAsync();

        var lessonsCountDict = lessonsCountByGradeLevel.ToDictionary(x => x.GradeLevelId, x => x.Count);

        // Count completions per StudentId directly from database (distinct student-lesson pairs)
        var completionsCountByStudent = await _completionRepo.Query()
            .Where(c => studentIds.Contains(c.StudentId) && c.Lesson.IsActive)
            .Select(c => new { c.StudentId, c.LessonId })
            .Distinct()
            .GroupBy(c => c.StudentId)
            .Select(g => new { StudentId = g.Key, Count = g.Count() })
            .ToListAsync();

        var completionsCountDict = completionsCountByStudent.ToDictionary(x => x.StudentId, x => x.Count);

        return students.Select(s => {
            var total = 0;
            if (gradeLevelLookup.TryGetValue(s.GradeId, out var glId) && glId.HasValue)
                lessonsCountDict.TryGetValue(glId.Value, out total);
            completionsCountDict.TryGetValue(s.Id, out var completed);
            return new StudentProgressStatDto {
                Name = s.FirstName,
                Progress = total == 0 ? 0 : Math.Round((double)completed / total * 100, 2)
            };
        }).ToList();
    }

    private async Task<List<GradeAttendanceStatDto>> GetGradeAttendanceStatsAsync(Guid? schoolId)
    {
        // Return the real 30-day attendance rate per grade.
        // Formula: (Present + Late records) / total records × 100, defaulting to 0 if no records.
        var grades = await _gradeRepo.GetAllAsync(q =>
            schoolId.HasValue
                ? q.Where(g => g.IsActive && g.SchoolId == schoolId).Take(5)
                : q.Where(g => g.IsActive).Take(5));

        if (!grades.Any())
            return new List<GradeAttendanceStatDto>();

        var gradeIds   = grades.Select(g => g.Id).ToList();
        var cutoffDate = DateTime.UtcNow.AddDays(-30);

        // One query: group attendance by student's grade id, count totals and presents
        var rawStats = await _attendanceRepo.Query()
            .Where(a => a.Date >= cutoffDate
                     && a.Student != null
                     && gradeIds.Contains(a.Student.GradeId))
            .GroupBy(a => a.Student!.GradeId)
            .Select(g => new
            {
                GradeId = g.Key,
                Total   = g.Count(),
                Present = g.Count(a => a.Status == AttendanceStatus.Present
                                    || a.Status == AttendanceStatus.Late)
            })
            .ToListAsync();

        var statsByGrade = rawStats.ToDictionary(x => x.GradeId);

        return grades.Select(g =>
        {
            statsByGrade.TryGetValue(g.Id, out var s);
            var rate = (s == null || s.Total == 0)
                ? 0.0
                : Math.Round((double)s.Present / s.Total * 100, 1);
            return new GradeAttendanceStatDto { Grade = g.GradeName, Attendance = rate };
        }).ToList();
    }

    private async Task<List<TeacherStatDto>> GetTeacherStatsAsync(Guid? schoolId)
    {
        // Show up to 4 active teachers, with the count of active modules in their school
        // as a meaningful "value" (replaces the hardcoded 25).
        var teachers = await _teacherRepo.GetAllAsync(q =>
            schoolId.HasValue
                ? q.Where(t => t.IsActive && t.SchoolId == schoolId).Take(4)
                : q.Where(t => t.IsActive).Take(4));

        if (!teachers.Any())
            return new List<TeacherStatDto>();

        // Count active modules assigned to each school in one query. Units are
        // school-agnostic master content now, so "assigned to school" is resolved
        // via SchoolUnitAssignment rather than a (removed) Module.SchoolId.
        var schoolIds   = teachers.Select(t => t.SchoolId).Distinct().ToList();
        var moduleCounts = await _moduleRepo.Query()
            .Where(m => m.IsActive)
            .SelectMany(m => m.SchoolAssignments.Where(a => !a.IsDeleted && schoolIds.Contains(a.SchoolId)))
            .GroupBy(a => a.SchoolId)
            .Select(g => new { SchoolId = g.Key, Count = g.Count() })
            .ToListAsync();

        var countBySchool = moduleCounts
            .ToDictionary(x => x.SchoolId, x => x.Count);

        return teachers.Select(t => new TeacherStatDto
        {
            Name  = t.FirstName,
            Value = countBySchool.TryGetValue(t.SchoolId, out var c) ? c : 0
        }).ToList();
    }

    public async Task<StudentDashboardDto?> GetStudentDashboardAsync(Guid? userId, Guid? studentId = null, string? subjectFilter = null)
    {
        // Prefer direct lookup by student.Id (from "StudentId" JWT claim) — immune to UserId nullability.
        // Fall back to UserId lookup for backwards-compat.
        Student? student = null;
        if (studentId.HasValue)
            student = (await _studentRepo.GetAllAsync(q => q.Include(s => s.School).Include(s => s.Grade).Where(s => s.Id == studentId.Value))).FirstOrDefault();

        if (student == null && userId.HasValue)
            student = (await _studentRepo.GetAllAsync(q => q.Include(s => s.School).Include(s => s.Grade).Where(s => s.UserId == userId.Value))).FirstOrDefault();

        if (student == null)
            return null;

        // Units are keyed by the school-agnostic master GradeLevelId now — resolve via
        // the student's already-Included Grade nav, then scope to this school via
        // SchoolUnitAssignment (fail closed to an empty list if unresolved).
        var studentGradeLevelId = student.Grade?.GradeLevelId;
        var modules = studentGradeLevelId.HasValue
            ? await _moduleRepo.GetAllAsync(q => q.Where(m => m.IsActive &&
                m.GradeLevelId == studentGradeLevelId.Value &&
                m.SchoolAssignments.Any(a => !a.IsDeleted && a.SchoolId == student.SchoolId)))
            : new List<Module>();
        var moduleIds = modules.Select(m => m.Id).ToList();

        var lessons = await _lessonRepo.GetAllAsync(q => q.Where(l => l.IsActive && moduleIds.Contains(l.ModuleId)));
        
        var completionsRaw = await _completionRepo.GetAllAsync(q => q.Include(c => c.Lesson).ThenInclude(l => l.Module).Where(c => c.StudentId == student.Id));
        var completions = completionsRaw
            .GroupBy(c => c.LessonId)
            .Select(g => g.First())
            .ToList();

        var modulesProgress = new List<StudentModuleProgressDto>();
        foreach (var module in modules)
        {
            var moduleLessonsCount = lessons.Count(l => l.ModuleId == module.Id);
            var completedCount = completions.Count(c => c.Lesson?.ModuleId == module.Id);
            var pendingCount = Math.Max(0, moduleLessonsCount - completedCount);
            var pct = moduleLessonsCount == 0 ? 0.0 : Math.Round((double)completedCount / moduleLessonsCount * 100, 2);

            modulesProgress.Add(new StudentModuleProgressDto
            {
                ModuleId = module.Id,
                ModuleName = module.Name,
                TotalLessons = moduleLessonsCount,
                CompletedLessons = completedCount,
                PendingLessons = pendingCount,
                CompletionPercentage = pct
            });
        }

        var recentCompletions = completions
            .OrderByDescending(c => c.CreatedAt)
            .Take(5)
            .Select(c => new RecentCompletionDto
            {
                LessonName = c.Lesson?.SubTopic ?? "Unknown",
                ModuleName = c.Lesson?.Module?.Name ?? "Unknown",
                CompletedAt = c.CreatedAt
            }).ToList();

        var results = await _resultRepo.GetAllAsync(q => q
            .IgnoreQueryFilters()
            .Include(r => r.Exam).ThenInclude(e => e.Module)
            .Include(r => r.Exam).ThenInclude(e => e.Lesson)
            .Where(r => !r.IsDeleted && r.StudentId == student.Id && r.IsPublished && r.SchoolId == student.SchoolId && r.Exam != null && !r.Exam.IsDeleted && (r.Exam.Module == null || !r.Exam.Module.IsDeleted) && (r.Exam.Lesson == null || !r.Exam.Lesson.IsDeleted)));
        var examCount = results.Count;
        var avgScore = examCount == 0 ? 0.0 : Math.Round((double)results.Average(r => r.ObtainedMarks), 2);

        // Group results by ExamId to handle multiple attempts
        var resultsByExam = results
            .Where(r => r.Exam != null)
            .GroupBy(r => r.ExamId)
            .ToList();

        var failedUnitsList = new List<FailedUnitDto>();
        var passedUnitsList = new List<PassedUnitDto>();

        foreach (var group in resultsByExam)
        {
            var exam = group.First().Exam!;
            var passingMarks = exam.PassingMarks ?? (int)Math.Ceiling((exam.TotalMarks ?? 0) * 0.40);

            // Check if there is any passing attempt in this group
            var hasPassed = group.Any(r => r.Remarks == "PASSED" || (r.Remarks != "FAILED" && r.ObtainedMarks >= passingMarks));

            if (hasPassed)
            {
                var bestPassingAttempt = group
                    .Where(r => r.Remarks == "PASSED" || (r.Remarks != "FAILED" && r.ObtainedMarks >= passingMarks))
                    .OrderByDescending(r => r.ObtainedMarks)
                    .First();

                passedUnitsList.Add(new PassedUnitDto
                {
                    ModuleId = exam.ModuleId,
                    ModuleName = exam.Module?.Name ?? "Unknown Module",
                    LessonId = exam.LessonId,
                    LessonName = exam.Lesson?.SubTopic,
                    ExamTitle = exam.Title ?? "Unit Test",
                    ObtainedMarks = bestPassingAttempt.ObtainedMarks,
                    TotalMarks = exam.TotalMarks ?? 0,
                    PassingMarks = passingMarks
                });
            }
            else
            {
                var worstFailedAttempt = group
                    .OrderByDescending(r => r.CreatedAt)
                    .First();

                failedUnitsList.Add(new FailedUnitDto
                {
                    ModuleId = exam.ModuleId,
                    ModuleName = exam.Module?.Name ?? "Unknown Module",
                    LessonId = exam.LessonId,
                    LessonName = exam.Lesson?.SubTopic,
                    ExamTitle = exam.Title ?? "Unit Test",
                    ObtainedMarks = worstFailedAttempt.ObtainedMarks,
                    TotalMarks = exam.TotalMarks ?? 0,
                    PassingMarks = passingMarks
                });
            }
        }

        var totalLessons = lessons.Count;
        var totalCompleted = completions.Count;
        var pendingLessons = Math.Max(0, totalLessons - totalCompleted);
        var syllabusPct = totalLessons == 0 ? 0.0 : Math.Round((double)totalCompleted / totalLessons * 100, 2);

        if (!string.IsNullOrEmpty(subjectFilter) && subjectFilter != "All")
        {
            modulesProgress = modulesProgress.Where(m => m.ModuleName == subjectFilter).ToList();
            recentCompletions = recentCompletions.Where(c => c.ModuleName == subjectFilter).ToList();
            failedUnitsList = failedUnitsList.Where(f => f.ModuleName == subjectFilter).ToList();
            passedUnitsList = passedUnitsList.Where(p => p.ModuleName == subjectFilter).ToList();

            var totalLessonsFiltered = modulesProgress.Sum(m => m.TotalLessons);
            var completedLessonsFiltered = modulesProgress.Sum(m => m.CompletedLessons);
            pendingLessons = modulesProgress.Sum(m => m.PendingLessons);
            syllabusPct = totalLessonsFiltered == 0 ? 0.0 : Math.Round((double)completedLessonsFiltered / totalLessonsFiltered * 100, 2);
        }

        var examResultsList = results.Select(r => {
            var passing = r.Exam?.PassingMarks ?? (int)Math.Ceiling((r.Exam?.TotalMarks ?? 0) * 0.40);
            return new ExamResultDto
            {
                ExamId = r.ExamId,
                ObtainedMarks = r.ObtainedMarks,
                PassingMarks = passing,
                IsPassed = r.Remarks == "PASSED" || r.ObtainedMarks >= passing
            };
        }).ToList();

        return new StudentDashboardDto
        {
            Id = student.Id,
            StudentName = $"{student.FirstName} {student.LastName}",
            GradeName = student.Grade?.GradeName ?? "N/A",
            SchoolName = student.School?.Name ?? "N/A",
            StudentId = student.StudentId,
            RollNo = student.RollNo,
            GradeId = student.GradeId,
            TotalModules = modules.Count,
            CompletedLessons = totalCompleted,
            PendingLessons = pendingLessons,
            SyllabusCompletionPercentage = syllabusPct,
            TotalExams = examCount,
            AverageExamScore = avgScore,
            ModulesProgress = modulesProgress,
            RecentCompletions = recentCompletions,
            FailedUnits = failedUnitsList,
            PassedUnits = passedUnitsList,
            ExamResults = examResultsList
        };
    }

    public async Task<TeacherDashboardDto> GetTeacherDashboardAsync(Guid? userId, Guid? teacherId = null, string? gradeFilter = null)
    {
        // Mirrors the dual-lookup pattern in GetStudentDashboardAsync.
        // Try Teacher.Id (PK) first — immune to UserId linkage gaps — then fall back to UserId.
        Teacher? teacher = null;

        if (teacherId.HasValue)
            teacher = (await _teacherRepo.GetAllAsync(q => q.Include(t => t.School)
                .Where(t => t.Id == teacherId.Value))).FirstOrDefault();

        if (teacher == null && userId.HasValue)
            teacher = (await _teacherRepo.GetAllAsync(q => q.Include(t => t.School)
                .Where(t => t.UserId == userId.Value))).FirstOrDefault();

        // Final fallback: match Teacher by email via the User record.
        // Handles the case where Teacher.UserId was never set (de-synced rows),
        // since TeacherService.CreateAsync always writes the same email to both tables.
        if (teacher == null && userId.HasValue)
        {
            var user = await _userRepo.GetByIdAsync(userId.Value);
            if (user != null && !string.IsNullOrEmpty(user.Email))
            {
                var userEmail = user.Email.ToLower().Trim();
                teacher = (await _teacherRepo.GetAllAsync(q => q.Include(t => t.School)
                    .Where(t => t.Email.ToLower() == userEmail))).FirstOrDefault();

                // Opportunistically fix the broken UserId so future lookups succeed directly.
                if (teacher != null && teacher.UserId != userId.Value)
                {
                    teacher.UserId = userId.Value;
                    await _teacherRepo.UpdateAsync(teacher);
                }
            }
        }

        if (teacher == null)
            throw new Exception($"Teacher profile not found. TeacherId={teacherId}, UserId={userId}");

        var totalStudents = await _studentRepo.CountAsync(q => q.Where(s => s.IsActive && s.SchoolId == teacher.SchoolId));
        var totalModules  = await _moduleRepo.CountAsync(q => q.Where(m => m.IsActive && m.SchoolAssignments.Any(a => !a.IsDeleted && a.SchoolId == teacher.SchoolId)));
        var totalLessons  = await _lessonRepo.CountAsync(q => q.Where(l => l.IsActive && l.SchoolAssignments.Any(a => !a.IsDeleted && a.SchoolId == teacher.SchoolId)));
        var totalExams    = await _examRepo.CountAsync(q => q.Where(e => e.IsActive && e.SchoolId == teacher.SchoolId));

        var grades = await _gradeRepo.GetAllAsync(q => q.Where(g => g.SchoolId == teacher.SchoolId));
        var gradeProgressList = new List<GradeProgressDto>();

        foreach (var grade in grades)
        {
            var gradeStudents = await _studentRepo.GetAllAsync(q => q.Where(s => s.GradeId == grade.Id));
            var studentIds = gradeStudents.Select(s => s.Id).ToList();

            // Units assigned to this school at this grade's master GradeLevel.
            var gradeModuleIds = grade.GradeLevelId.HasValue
                ? (await _moduleRepo.GetAllAsync(q => q.Where(m =>
                      m.GradeLevelId == grade.GradeLevelId.Value &&
                      m.SchoolAssignments.Any(a => !a.IsDeleted && a.SchoolId == teacher.SchoolId))))
                  .Select(m => m.Id).ToList()
                : new List<Guid>();
            var gradeLessonsCount = await _lessonRepo.CountAsync(q => q.Where(l => gradeModuleIds.Contains(l.ModuleId)));

            var gradeCompletions = await _completionRepo.Query()
                .Where(c => studentIds.Contains(c.StudentId) && gradeModuleIds.Contains(c.Lesson.ModuleId) && c.Lesson.IsActive)
                .Select(c => new { c.StudentId, c.LessonId })
                .Distinct()
                .CountAsync();
            var totalExpectedCompletions = gradeLessonsCount * studentIds.Count;
            var completionPct = totalExpectedCompletions == 0 ? 0.0 : Math.Round((double)gradeCompletions / totalExpectedCompletions * 100, 2);

            gradeProgressList.Add(new GradeProgressDto
            {
                GradeId = grade.Id,
                GradeName = grade.GradeName,
                TotalStudents = studentIds.Count,
                SyllabusCompletionPercentage = completionPct
            });
        }

        var recentCompletions = await _completionRepo.GetAllAsync(q => q.Include(c => c.Student).Include(c => c.Lesson).Where(c => c.SchoolId == teacher.SchoolId).OrderByDescending(c => c.CreatedAt).Take(5));
        var recentActivities = recentCompletions.Select(c => new RecentActivityDto
        {
            Description = $"{c.Student?.FirstName ?? "A student"} completed lesson '{c.Lesson?.SubTopic ?? "Unknown"}'",
            Timestamp = c.CreatedAt
        }).ToList();

        var schoolResults = await _resultRepo.GetAllAsync(q => q
            .IgnoreQueryFilters()
            .Include(r => r.Student).ThenInclude(s => s.Grade)
            .Include(r => r.Exam).ThenInclude(e => e.Module)
            .Where(r => !r.IsDeleted && r.SchoolId == teacher.SchoolId && r.Student != null && !r.Student.IsDeleted && r.Exam != null && !r.Exam.IsDeleted && (r.Exam.Module == null || !r.Exam.Module.IsDeleted)));

        var weakAreasList = schoolResults
            .Where(r => r.Remarks == "FAILED" || (r.Exam != null && r.ObtainedMarks < (r.Exam.PassingMarks ?? (int)Math.Ceiling((r.Exam.TotalMarks ?? 0) * 0.40))))
            .Select(r => new WeakAreaDto
            {
                GradeName = r.Student?.Grade?.GradeName ?? "Unknown Grade",
                StudentName = $"{r.Student?.FirstName} {r.Student?.LastName}",
                ModuleName = r.Exam?.Module?.Name ?? "Unknown Module",
                ExamTitle = r.Exam?.Title ?? "Unit Test",
                ObtainedMarks = r.ObtainedMarks,
                TotalMarks = r.Exam?.TotalMarks ?? 0,
                PassingMarks = r.Exam?.PassingMarks ?? (int)Math.Ceiling((r.Exam?.TotalMarks ?? 0) * 0.40)
            }).ToList();

        if (!string.IsNullOrEmpty(gradeFilter) && gradeFilter != "All")
        {
            gradeProgressList = gradeProgressList.Where(g => g.GradeName == gradeFilter).ToList();
            weakAreasList = weakAreasList.Where(w => w.GradeName == gradeFilter).ToList();

            totalStudents = gradeProgressList.Sum(g => g.TotalStudents);
        }

        return new TeacherDashboardDto
        {
            TeacherName = $"{teacher.FirstName} {teacher.LastName}",
            SchoolName = teacher.School?.Name ?? "N/A",
            EmployeeId = teacher.EmployeeId,
            TotalStudents = totalStudents,
            TotalModules = totalModules,
            TotalLessons = totalLessons,
            TotalExams = totalExams,
            GradeProgressList = gradeProgressList,
            RecentActivities = recentActivities,
            WeakAreas = weakAreasList
        };
    }
}
