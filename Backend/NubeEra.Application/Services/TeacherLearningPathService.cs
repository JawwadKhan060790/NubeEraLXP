using Microsoft.EntityFrameworkCore;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Repositories;
using NubeEra.Application.Interfaces.Security;
using NubeEra.Application.Interfaces.Services;
using NubeEra.Domain.Entities;

namespace NubeEra.Application.Services;

public class TeacherLearningPathService : ITeacherLearningPathService
{
    private readonly IGenericRepository<TeacherLessonProgress> _progressRepo;
    private readonly IGenericRepository<TeacherSchedulePeriod> _periodRepo;
    private readonly IGenericRepository<Teacher>               _teacherRepo;
    private readonly IGenericRepository<Grade>                 _gradeRepo;
    private readonly IGenericRepository<Module>                _moduleRepo;
    private readonly IGenericRepository<Lesson>                _lessonRepo;
    private readonly IGenericRepository<Student>               _studentRepo;
    private readonly IGenericRepository<Attendance>            _attendanceRepo;
    private readonly IGenericRepository<LessonCompletion>      _completionRepo;
    private readonly IGenericRepository<StudentWeakTopic>      _weakTopicRepo;
    private readonly IGenericRepository<Scheduler>             _schedulerRepo;
    private readonly IGenericRepository<GradeSection>          _sectionRepo;
    private readonly ICurrentUserService                       _currentUserService;
    private readonly IStudentWeakTopicService                  _weakTopicService;

    public TeacherLearningPathService(
        IGenericRepository<TeacherLessonProgress> progressRepo,
        IGenericRepository<TeacherSchedulePeriod> periodRepo,
        IGenericRepository<Teacher>               teacherRepo,
        IGenericRepository<Grade>                 gradeRepo,
        IGenericRepository<Module>                moduleRepo,
        IGenericRepository<Lesson>                lessonRepo,
        IGenericRepository<Student>               studentRepo,
        IGenericRepository<Attendance>            attendanceRepo,
        IGenericRepository<LessonCompletion>      completionRepo,
        IGenericRepository<StudentWeakTopic>      weakTopicRepo,
        IGenericRepository<Scheduler>             schedulerRepo,
        IGenericRepository<GradeSection>          sectionRepo,
        ICurrentUserService                       currentUserService,
        IStudentWeakTopicService                  weakTopicService)
    {
        _progressRepo       = progressRepo;
        _periodRepo         = periodRepo;
        _teacherRepo        = teacherRepo;
        _gradeRepo          = gradeRepo;
        _moduleRepo         = moduleRepo;
        _lessonRepo         = lessonRepo;
        _studentRepo        = studentRepo;
        _attendanceRepo     = attendanceRepo;
        _completionRepo     = completionRepo;
        _weakTopicRepo      = weakTopicRepo;
        _schedulerRepo      = schedulerRepo;
        _sectionRepo        = sectionRepo;
        _currentUserService = currentUserService;
        _weakTopicService   = weakTopicService;
    }

    // ── Get all-grade learning paths for a teacher ───────────────────────────

    public async Task<List<TeacherLearningPathDto>> GetLearningPathAsync(Guid teacherId)
    {
        var combinations = await GetTeacherGradeSectionCombinationsAsync(teacherId);
        var result = new List<TeacherLearningPathDto>();
        foreach (var comb in combinations)
        {
            result.Add(await BuildLearningPathForGradeAsync(teacherId, comb.Grade, comb.Section?.Id));
        }
        return result;
    }

    public async Task<TeacherLearningPathDto> GetLearningPathByGradeAsync(Guid teacherId, Guid gradeId, Guid? sectionId)
    {
        var grade = await _gradeRepo.GetByIdAsync(gradeId)
            ?? throw new KeyNotFoundException($"Grade {gradeId} not found.");
        return await BuildLearningPathForGradeAsync(teacherId, grade, sectionId);
    }

    private async Task<TeacherLearningPathDto> BuildLearningPathForGradeAsync(Guid teacherId, Grade grade, Guid? sectionId)
    {
        GradeSection? section = null;
        if (sectionId.HasValue)
        {
            section = await _sectionRepo.GetByIdAsync(sectionId.Value);
        }

        // Load modules for this grade — Units are master content keyed by the grade's
        // master GradeLevel, scoped to this grade's school via SchoolUnitAssignment.
        var modules = grade.GradeLevelId.HasValue
            ? await _moduleRepo.GetAllAsync(q =>
                q.Where(m => m.GradeLevelId == grade.GradeLevelId.Value &&
                             m.IsActive &&
                             m.SchoolAssignments.Any(a => !a.IsDeleted && a.SchoolId == grade.SchoolId))
                  .Include(m => m.Lessons.Where(l => l.IsActive))
                  .OrderBy(m => m.Name))
            : new List<Module>();

        // Load teacher's existing progress records for this grade and section.
        // Use IgnoreQueryFilters so records saved with a different SchoolId
        // (e.g. teacher's home school before the multi-school fix) are still found.
        var progresses = await _progressRepo.GetAllAsync(q =>
            q.IgnoreQueryFilters()
             .Where(p => !p.IsDeleted &&
                         p.TeacherId == teacherId &&
                         p.GradeId == grade.Id &&
                         p.SectionId == sectionId));

        // Deduplicate by LessonId — old records (wrong SchoolId) and new records
        // (correct grade SchoolId) may coexist; keep the most recently updated one.
        var progressMap = progresses
            .GroupBy(p => p.LessonId)
            .ToDictionary(
                g => g.Key,
                g => g.OrderByDescending(p => p.UpdatedDate ?? p.CreatedAt).First());

        // Load completed schedule periods for the teacher in this grade & section
        var completedPeriods = await _periodRepo.GetAllAsync(q => q
            .IgnoreQueryFilters()
            .Where(p => !p.IsDeleted &&
                        p.TeacherId == teacherId && 
                        p.GradeId == grade.Id && 
                        p.Status == PeriodStatus.Completed)
            .Include(p => p.Scheduler));

        var filteredPeriods = completedPeriods
            .Where(p => p.Scheduler != null && 
                        p.Scheduler.LessonId.HasValue && 
                        (sectionId == null || p.Scheduler.SectionId == sectionId))
            .ToList();

        var moduleList   = new List<TeacherModuleProgressDto>();
        int totalTopics  = 0, completedTopics = 0, inProgressTopics = 0;

        foreach (var module in modules)
        {
            var orderedLessons = module.Lessons.OrderBy(l => l.DisplayOrder).ThenBy(l => l.SerialNumber).ToList();
            var topicList      = new List<TeacherTopicProgressDto>();
            int mCompleted     = 0;
            int mExpectedPeriods = 0;
            int mExecutedPeriods = 0;
            double mExecutedHours = 0.0;

            foreach (var lesson in orderedLessons)
            {
                progressMap.TryGetValue(lesson.Id, out var prog);
                var status = prog?.Status ?? TeacherTopicStatus.NotStarted;

                // Executed periods and hours calculation
                var lessonPeriods = filteredPeriods.Where(p => p.Scheduler.LessonId == lesson.Id).ToList();
                int executedPeriods = lessonPeriods.Count;
                double executedHours = 0.0;
                foreach (var p in lessonPeriods)
                {
                    if (p.ActualStartTime.HasValue && p.ActualEndTime.HasValue)
                    {
                        executedHours += (p.ActualEndTime.Value - p.ActualStartTime.Value).TotalHours;
                    }
                }
                executedHours = Math.Round(executedHours, 2);

                topicList.Add(new TeacherTopicProgressDto
                {
                    LessonId     = lesson.Id,
                    SubTopic     = lesson.SubTopic,
                    SerialNumber = lesson.SerialNumber,
                    Status       = status.ToString(),
                    StartedAt    = prog?.StartedAt,
                    CompletedAt  = prog?.CompletedAt,
                    Remarks      = prog?.Remarks,
                    IsActivity   = lesson.IsActivity,
                    ExpectedPeriods = lesson.ExpectedPeriods,
                    ExecutedPeriods = executedPeriods,
                    ExecutedHours   = executedHours
                });

                totalTopics++;
                if (status == TeacherTopicStatus.Completed)  { completedTopics++;   mCompleted++; }
                if (status == TeacherTopicStatus.InProgress) { inProgressTopics++; }

                mExpectedPeriods += lesson.ExpectedPeriods;
                mExecutedPeriods += executedPeriods;
                mExecutedHours += executedHours;
            }

            int mTotal = orderedLessons.Count;
            moduleList.Add(new TeacherModuleProgressDto
            {
                ModuleId             = module.Id,
                ModuleName           = module.Name,
                TotalLessons         = mTotal,
                CompletedLessons     = mCompleted,
                CompletionPercentage = mTotal == 0 ? 0 : Math.Round((double)mCompleted / mTotal * 100, 1),
                ExpectedPeriods      = mExpectedPeriods,
                ExecutedPeriods      = mExecutedPeriods,
                ExecutedHours        = Math.Round(mExecutedHours, 2),
                Topics               = topicList
            });
        }

        int pending = totalTopics - completedTopics - inProgressTopics;

        return new TeacherLearningPathDto
        {
            GradeId              = grade.Id,
            GradeName            = grade.GradeName,
            SectionId            = section?.Id,
            SectionName          = section?.SectionCode ?? section?.SectionName,
            TotalTopics          = totalTopics,
            CompletedTopics      = completedTopics,
            InProgressTopics     = inProgressTopics,
            PendingTopics        = pending < 0 ? 0 : pending,
            CompletionPercentage = totalTopics == 0 ? 0 : Math.Round((double)completedTopics / totalTopics * 100, 1),
            Modules              = moduleList
        };
    }

    public async Task UpdateTopicStatusAsync(Guid teacherId, UpdateTeacherTopicStatusDto dto)
    {
        var teacher = await _teacherRepo.GetByIdAsync(teacherId)
            ?? throw new KeyNotFoundException("Teacher not found.");

        if (!Enum.TryParse<TeacherTopicStatus>(dto.Status, true, out var statusEnum))
            throw new ArgumentException($"Invalid status: {dto.Status}");

        // Resolve SchoolId from the grade (not teacher.SchoolId) so the record
        // matches the tenant query filter when the teacher has switched schools.
        var grade = await _gradeRepo.GetByIdAsync(dto.GradeId)
            ?? throw new KeyNotFoundException("Grade not found.");
        var effectiveSchoolId = grade.SchoolId ?? teacher.SchoolId;

        // Search with IgnoreQueryFilters to find any existing record regardless
        // of tenant scope — prevents duplicate key errors when the old index
        // (TeacherId, LessonId, SectionId) is still in place.
        var existing = (await _progressRepo.GetAllAsync(q =>
            q.IgnoreQueryFilters()
             .Where(p => !p.IsDeleted &&
                         p.TeacherId == teacherId &&
                         p.LessonId == dto.LessonId &&
                         p.GradeId == dto.GradeId &&
                         p.SectionId == dto.SectionId)))
            .FirstOrDefault();

        // Fallback: check old index shape (without GradeId) for pre-migration data
        existing ??= (await _progressRepo.GetAllAsync(q =>
            q.IgnoreQueryFilters()
             .Where(p => !p.IsDeleted &&
                         p.TeacherId == teacherId &&
                         p.LessonId == dto.LessonId &&
                         p.SectionId == dto.SectionId)))
            .FirstOrDefault();

        if (existing == null)
        {
            var newProg = new TeacherLessonProgress
            {
                SchoolId   = effectiveSchoolId,
                TeacherId  = teacherId,
                GradeId    = dto.GradeId,
                ModuleId   = dto.ModuleId,
                LessonId   = dto.LessonId,
                SectionId  = dto.SectionId,
                Status     = statusEnum,
                StartedAt  = statusEnum == TeacherTopicStatus.NotStarted ? null : DateTime.UtcNow,
                CompletedAt= statusEnum == TeacherTopicStatus.Completed   ? DateTime.UtcNow : null,
                Remarks    = dto.Remarks
            };
            await _progressRepo.AddAsync(newProg);
        }
        else
        {
            // Update existing record — also fix SchoolId/GradeId if they were stale
            existing.SchoolId = effectiveSchoolId;
            existing.GradeId  = dto.GradeId;
            existing.ModuleId = dto.ModuleId;
            existing.Status   = statusEnum;
            if (statusEnum == TeacherTopicStatus.InProgress && existing.StartedAt == null)
                existing.StartedAt = DateTime.UtcNow;
            if (statusEnum == TeacherTopicStatus.Completed)
                existing.CompletedAt = DateTime.UtcNow;
            if (statusEnum == TeacherTopicStatus.NotStarted)
            {
                existing.StartedAt  = null;
                existing.CompletedAt= null;
            }
            if (dto.Remarks != null)
                existing.Remarks = dto.Remarks;
            await _progressRepo.UpdateAsync(existing);
        }

        // When marking as Completed, auto-create a TeacherSchedulePeriod so that
        // "Executed Periods" increments even when there is no scheduler entry.
        if (statusEnum == TeacherTopicStatus.Completed)
        {
            // Check whether a schedule-based period already exists for this lesson/grade/section
            var existingPeriods = await _periodRepo.GetAllAsync(q => q
                .Where(p => p.TeacherId == teacherId &&
                            p.GradeId == dto.GradeId &&
                            p.Status == PeriodStatus.Completed)
                .Include(p => p.Scheduler));

            bool hasScheduledPeriod = existingPeriods
                .Any(p => p.Scheduler != null &&
                          p.Scheduler.LessonId == dto.LessonId &&
                          (dto.SectionId == null || p.Scheduler.SectionId == dto.SectionId));

            if (!hasScheduledPeriod)
            {
                // Find or create a matching scheduler entry for the auto-period
                var schedulers = await _schedulerRepo.GetAllAsync(q => q
                    .Where(s => s.TeacherId == teacherId &&
                                s.GradeId == dto.GradeId &&
                                s.LessonId == dto.LessonId &&
                                (dto.SectionId == null || s.SectionId == dto.SectionId)));

                Guid schedulerId;
                if (schedulers.Any())
                {
                    schedulerId = schedulers.First().Id;
                }
                else
                {
                    // Create a lightweight scheduler entry so the period FK is satisfied
                    var newScheduler = new Scheduler
                    {
                        SchoolId  = effectiveSchoolId,
                        TeacherId = teacherId,
                        GradeId   = dto.GradeId,
                        ModuleId  = dto.ModuleId,
                        LessonId  = dto.LessonId,
                        SectionId = dto.SectionId,
                        Date      = DateTime.UtcNow.Date,
                        StartTime = TimeSpan.FromHours(9),
                        EndTime   = TimeSpan.FromHours(10),
                        IsActive  = true
                    };
                    await _schedulerRepo.AddAsync(newScheduler);
                    schedulerId = newScheduler.Id;
                }

                var now = DateTime.UtcNow;
                var autoPeriod = new TeacherSchedulePeriod
                {
                    SchoolId        = effectiveSchoolId,
                    TeacherId       = teacherId,
                    GradeId         = dto.GradeId,
                    SchedulerId     = schedulerId,
                    PeriodDate      = now.Date,
                    Status          = PeriodStatus.Completed,
                    ActualStartTime = now,
                    ActualEndTime   = now.AddMinutes(45),
                    Remarks         = "Auto-recorded on topic completion"
                };
                await _periodRepo.AddAsync(autoPeriod);
            }
        }
    }

    public async Task<TeacherSyllabusCompletionDto> GetSyllabusCompletionAsync(Guid teacherId)
    {
        var combinations = await GetTeacherGradeSectionCombinationsAsync(teacherId);
        var gradeIds = combinations.Select(c => c.Grade.Id).Distinct().ToHashSet();
        var gradeLevelIds = combinations
            .Where(c => c.Grade.GradeLevelId.HasValue)
            .Select(c => c.Grade.GradeLevelId!.Value)
            .Distinct().ToHashSet();
        var combinationSchoolIds = combinations.Select(c => c.Grade.SchoolId).Distinct().ToHashSet();

        var allProgress = await _progressRepo.GetAllAsync(q =>
            q.IgnoreQueryFilters()
             .Where(p => !p.IsDeleted && p.TeacherId == teacherId));

        // Grade breakdown
        var gradeBreakdown = new List<GradeSyllabusDto>();
        int totalAll = 0, completedAll = 0;

        foreach (var comb in combinations)
        {
            // Units are master content keyed by the grade's master GradeLevel, scoped
            // to this grade's school via SchoolUnitAssignment.
            var modules = comb.Grade.GradeLevelId.HasValue
                ? await _moduleRepo.GetAllAsync(q =>
                    q.Where(m => m.GradeLevelId == comb.Grade.GradeLevelId.Value &&
                                 m.IsActive &&
                                 m.SchoolAssignments.Any(a => !a.IsDeleted && a.SchoolId == comb.Grade.SchoolId))
                     .Include(m => m.Lessons.Where(l => l.IsActive)))
                : new List<Module>();

            int total     = modules.Sum(m => m.Lessons.Count);
            int completed = allProgress.Count(p => p.GradeId == comb.Grade.Id && p.SectionId == comb.Section?.Id && p.Status == TeacherTopicStatus.Completed);
            totalAll     += total;
            completedAll += completed;

            var sectionSuffix = comb.Section != null ? $" - {comb.Section.SectionCode ?? comb.Section.SectionName}" : "";

            gradeBreakdown.Add(new GradeSyllabusDto
            {
                GradeId              = comb.Grade.Id,
                SectionId            = comb.Section?.Id,
                GradeName            = $"{comb.Grade.GradeName}{sectionSuffix}",
                TotalTopics          = total,
                CompletedTopics      = completed,
                CompletionPercentage = total == 0 ? 0 : Math.Round((double)completed / total * 100, 1)
            });
        }

        // Subject (module) breakdown — Units are keyed by master GradeLevel now, scoped
        // to the teacher's school(s) via SchoolUnitAssignment.
        var subjectBreakdown = new List<SubjectSyllabusDto>();
        var allModules = await _moduleRepo.GetAllAsync(q =>
            q.Where(m => gradeLevelIds.Contains(m.GradeLevelId) &&
                         m.IsActive &&
                         m.SchoolAssignments.Any(a => !a.IsDeleted && combinationSchoolIds.Contains(a.SchoolId)))
             .Include(m => m.Lessons.Where(l => l.IsActive))
             .Include(m => m.GradeLevel));

        foreach (var m in allModules)
        {
            int total     = m.Lessons.Count;
            int completed = allProgress.Count(p => p.ModuleId == m.Id && p.Status == TeacherTopicStatus.Completed);
            subjectBreakdown.Add(new SubjectSyllabusDto
            {
                ModuleId             = m.Id,
                ModuleName           = m.Name,
                GradeName            = m.GradeLevel?.Name ?? "",
                TotalTopics          = total,
                CompletedTopics      = completed,
                CompletionPercentage = total == 0 ? 0 : Math.Round((double)completed / total * 100, 1)
            });
        }

        // Monthly breakdown (past 6 months)
        var monthlyBreakdown = new List<MonthlySyllabusDto>();
        var now = DateTime.UtcNow;
        for (int i = 5; i >= 0; i--)
        {
            var targetMonth = now.AddMonths(-i);
            int mCompleted  = allProgress.Count(p =>
                p.Status == TeacherTopicStatus.Completed &&
                p.CompletedAt.HasValue &&
                p.CompletedAt.Value.Month == targetMonth.Month &&
                p.CompletedAt.Value.Year  == targetMonth.Year);

            monthlyBreakdown.Add(new MonthlySyllabusDto
            {
                Month                = targetMonth.Month,
                Year                 = targetMonth.Year,
                MonthName            = targetMonth.ToString("MMM yyyy"),
                CompletedTopics      = mCompleted,
                CompletionPercentage = totalAll == 0 ? 0 : Math.Round((double)mCompleted / totalAll * 100, 1)
            });
        }

        int remaining = totalAll - completedAll;
        return new TeacherSyllabusCompletionDto
        {
            OverallCompletionPercentage = totalAll == 0 ? 0 : Math.Round((double)completedAll / totalAll * 100, 1),
            GradeBreakdown             = gradeBreakdown,
            SubjectBreakdown           = subjectBreakdown,
            MonthlyBreakdown           = monthlyBreakdown,
            CompletedTopics            = completedAll,
            RemainingTopics            = remaining < 0 ? 0 : remaining,
            DelayedTopics              = 0, // Placeholder — requires expected-completion-date entity
            OverdueTopics              = 0
        };
    }

    // ── Grade-wise student list ──────────────────────────────────────────────

    public async Task<TeacherGradeStudentListDto> GetGradeStudentListAsync(Guid teacherId, Guid gradeId)
    {
        var grade = await _gradeRepo.GetByIdAsync(gradeId)
            ?? throw new KeyNotFoundException("Grade not found.");

        // Self-heal: pick up any failed exams that haven't been synced into
        // StudentWeakTopic yet, so the "Weak Topics" column here never depends
        // on someone remembering to click "Sync from Results".
        try { await _weakTopicService.SyncFromResultsAsync(gradeId, grade.SchoolId); }
        catch (Exception) { /* never block the read on a sync failure */ }

        var students = await _studentRepo.GetAllAsync(q =>
            q.Where(s => s.GradeId == gradeId && s.IsActive));

        var studentIds = students.Select(s => s.Id).ToHashSet();

        // Load completions, attendance, and weak topics in parallel
        var completions   = await _completionRepo.GetAllAsync(q =>
            q.Where(c => studentIds.Contains(c.StudentId))
             .Include(c => c.Lesson).ThenInclude(l => l.Module));
        var weakTopics    = await _weakTopicRepo.GetAllAsync(q =>
            q.Where(w => studentIds.Contains(w.StudentId) && !w.IsResolved));
        var attendances   = await _attendanceRepo.GetAllAsync(q =>
            q.Where(a => a.StudentId != null && studentIds.Contains(a.StudentId!.Value)));

        // Lesson totals for the grade (to compute completion %) — Units are master
        // content keyed by the grade's master GradeLevel, scoped to this grade's
        // school via SchoolUnitAssignment.
        var gradeModules = grade.GradeLevelId.HasValue
            ? await _moduleRepo.GetAllAsync(q =>
                q.Where(m => m.GradeLevelId == grade.GradeLevelId.Value &&
                             m.IsActive &&
                             m.SchoolAssignments.Any(a => !a.IsDeleted && a.SchoolId == grade.SchoolId))
                 .Include(m => m.Lessons.Where(l => l.IsActive)))
            : new List<Module>();
        int totalLessons = gradeModules.Sum(m => m.Lessons.Count);

        // Period counts
        var schedulers = await _schedulerRepo.GetAllAsync(q =>
            q.Where(s => s.TeacherId == teacherId && s.GradeId == gradeId));
        int totalPeriodsPlanned = schedulers.Count;

        var periods = await _periodRepo.GetAllAsync(q =>
            q.Where(p => p.GradeId == gradeId && p.TeacherId == teacherId));
        int totalPeriodsConducted = periods.Count(p => p.Status == PeriodStatus.Completed);

        // Build student rows
        var rows         = new List<TeacherStudentRowDto>();
        int completedStu = 0, inProgressStu = 0, behindStu = 0;

        foreach (var s in students)
        {
            var studentCompletions  = completions.Where(c => c.StudentId == s.Id).ToList();
            var studentAttendances  = attendances.Where(a => a.StudentId == s.Id).ToList();
            var studentWeakTopics   = weakTopics.Where(w => w.StudentId == s.Id).ToList();

            int    completedLessons = studentCompletions.Count;
            double completionPct    = totalLessons == 0 ? 0 :
                Math.Round((double)completedLessons / totalLessons * 100, 1);

            int    presentDays   = studentAttendances.Count(a => a.Status == AttendanceStatus.Present);
            int    totalDays     = studentAttendances.Count;
            double attendancePct = totalDays == 0 ? 0 : Math.Round((double)presentDays / totalDays * 100, 1);

            // Last activity date = last completion date
            DateTime? lastActivity = studentCompletions
                .OrderByDescending(c => c.CompletionDate)
                .Select(c => (DateTime?)c.CompletionDate)
                .FirstOrDefault();

            // Current module/topic = the first not-yet-completed lesson in grade order
            var completedLessonIds = studentCompletions.Select(c => c.LessonId).ToHashSet();
            string? currentModule = null, currentTopic = null;

            foreach (var mod in gradeModules.OrderBy(m => m.Name))
            {
                var nextLesson = mod.Lessons
                    .OrderBy(l => l.DisplayOrder)
                    .ThenBy(l => l.SerialNumber)
                    .FirstOrDefault(l => !completedLessonIds.Contains(l.Id));
                if (nextLesson != null)
                {
                    currentModule = mod.Name;
                    currentTopic  = nextLesson.SubTopic;
                    break;
                }
            }

            // Velocity: fast = >80%, average = 40–80%, needs attention = <40%
            string velocity = completionPct >= 80 ? "Fast" :
                              completionPct >= 40 ? "Average" : "NeedsAttention";

            if (completionPct >= 100) completedStu++;
            else if (completionPct  > 0) inProgressStu++;
            else behindStu++;

            rows.Add(new TeacherStudentRowDto
            {
                StudentId               = s.Id,
                StudentName             = $"{s.FirstName} {s.LastName}",
                RollNo                  = s.RollNo,
                GradeName               = grade.GradeName,
                AttendancePercent       = attendancePct,
                CourseCompletionPercent = completionPct,
                WeakTopicsCount         = studentWeakTopics.Count,
                LastActivityDate        = lastActivity,
                CurrentModuleName       = currentModule,
                CurrentTopicName        = currentTopic,
                LearningVelocity        = velocity
            });
        }

        double avgAttendance = rows.Count == 0 ? 0 :
            Math.Round(rows.Average(r => r.AttendancePercent), 1);
        double gradeCompletion = rows.Count == 0 ? 0 :
            Math.Round(rows.Average(r => r.CourseCompletionPercent), 1);

        return new TeacherGradeStudentListDto
        {
            GradeId                  = grade.Id,
            GradeName                = grade.GradeName,
            GradeCompletionPercent   = gradeCompletion,
            AverageAttendancePercent = avgAttendance,
            TotalPeriodsPlanned      = totalPeriodsPlanned,
            TotalPeriodsConducted    = totalPeriodsConducted,
            PeriodsCompletionPercent = totalPeriodsPlanned == 0 ? 0 :
                Math.Round((double)totalPeriodsConducted / totalPeriodsPlanned * 100, 1),
            CompletedStudents        = completedStu,
            InProgressStudents       = inProgressStu,
            BehindScheduleStudents   = behindStu,
            Students                 = rows.OrderBy(r => r.StudentName).ToList()
        };
    }

    // ── Enhanced Dashboard ───────────────────────────────────────────────────

    public async Task<TeacherEnhancedDashboardDto> GetEnhancedDashboardAsync(Guid teacherId)
    {
        var teacher = await _teacherRepo.GetByIdAsync(teacherId);
        if (teacher == null) return new TeacherEnhancedDashboardDto();

        var today   = DateTime.UtcNow.Date;
        var grades  = await GetTeacherGradesAsync(teacherId);
        var gradeIds= grades.Select(g => g.Id).ToHashSet();
        var gradeLevelIds = grades.Where(g => g.GradeLevelId.HasValue)
            .Select(g => g.GradeLevelId!.Value).Distinct().ToHashSet();
        var gradeSchoolIds = grades.Select(g => g.SchoolId).Distinct().ToHashSet();

        // Today's schedule
        var todaySchedulers = await _schedulerRepo.GetAllAsync(q =>
            q.Where(s => s.TeacherId == teacherId && s.Date.Date == today)
             .Include(s => s.Grade).Include(s => s.Module).Include(s => s.Lesson));

        var todayPeriods = await _periodRepo.GetAllAsync(q =>
            q.Where(p => p.TeacherId == teacherId && p.PeriodDate.Date == today));
        var periodMap = todayPeriods.ToDictionary(p => p.SchedulerId);

        var todayScheduleList = todaySchedulers
            .OrderBy(s => s.StartTime)
            .Select(s =>
            {
                periodMap.TryGetValue(s.Id, out var period);
                var status = period?.Status ?? PeriodStatus.NotStarted;
                return new TeacherPeriodSummaryDto
                {
                    SchedulePeriodId = period?.Id ?? Guid.Empty,
                    SchedulerId      = s.Id,
                    GradeId          = s.GradeId,
                    GradeName        = s.Grade?.GradeName ?? "",
                    ModuleName       = s.Module?.Name,
                    LessonName       = s.Lesson?.SubTopic,
                    PeriodDate       = today,
                    StartTime        = s.StartTime,
                    EndTime          = s.EndTime,
                    Status           = status.ToString(),
                    Remarks          = period?.Remarks
                };
            }).ToList();

        int todayCompleted = todayScheduleList.Count(p => p.Status == "Completed");
        int todayMissed    = todayScheduleList.Count(p => p.Status == "Missed");
        int todayPending   = todayScheduleList.Count(p => p.Status is "NotStarted" or "InProgress");

        // Student count
        var students = await _studentRepo.GetAllAsync(q =>
            q.Where(s => gradeIds.Contains(s.GradeId) && s.IsActive));
        int totalStudents = students.Count;

        // Weak students = students with any weak topics
        var allWeakTopics = await _weakTopicRepo.GetAllAsync(q =>
            q.Where(w => gradeIds.Contains(w.GradeId) && !w.IsResolved));
        int weakStudents = allWeakTopics.Select(w => w.StudentId).Distinct().Count();

        // Syllabus completion — Units are master content keyed by master GradeLevel,
        // scoped to the teacher's school(s) via SchoolUnitAssignment.
        var allProgress = await _progressRepo.GetAllAsync(q => q.IgnoreQueryFilters().Where(p => !p.IsDeleted && p.TeacherId == teacherId));
        var allModules  = await _moduleRepo.GetAllAsync(q =>
            q.Where(m => gradeLevelIds.Contains(m.GradeLevelId) &&
                         m.IsActive &&
                         m.SchoolAssignments.Any(a => !a.IsDeleted && gradeSchoolIds.Contains(a.SchoolId)))
             .Include(m => m.Lessons.Where(l => l.IsActive)));
        int totalTopics     = allModules.Sum(m => m.Lessons.Count);
        int completedTopics = allProgress.Count(p => p.Status == TeacherTopicStatus.Completed);
        double syllabusCompletion = totalTopics == 0 ? 0 :
            Math.Round((double)completedTopics / totalTopics * 100, 1);

        // Attendance for teacher's students
        var studentIds = students.Select(s => s.Id).ToHashSet();
        var recentAttendances = await _attendanceRepo.GetAllAsync(q =>
            q.Where(a => a.StudentId != null && studentIds.Contains(a.StudentId!.Value) &&
                         a.Date >= today.AddDays(-30)));
        int presentCount = recentAttendances.Count(a => a.Status == AttendanceStatus.Present);
        int totalCount   = recentAttendances.Count;
        double attendancePct = totalCount == 0 ? 0 :
            Math.Round((double)presentCount / totalCount * 100, 1);

        // Grade progress cards
        var gradeProgressList = grades.Select(g =>
        {
            var gradeProgress = allProgress.Count(p => p.GradeId == g.Id && p.Status == TeacherTopicStatus.Completed);
            var gradeTotal    = g.GradeLevelId.HasValue
                ? allModules.Where(m => m.GradeLevelId == g.GradeLevelId.Value).Sum(m => m.Lessons.Count)
                : 0;
            double pct        = gradeTotal == 0 ? 0 : Math.Round((double)gradeProgress / gradeTotal * 100, 1);
            return new GradeProgressDto
            {
                GradeId                     = g.Id,
                GradeName                   = g.GradeName,
                TotalStudents               = students.Count(s => s.GradeId == g.Id),
                SyllabusCompletionPercentage= pct
            };
        }).ToList();

        // Upcoming periods (next 5 from today's remaining schedule)
        var upcomingPeriods = todayScheduleList
            .Where(p => p.Status is "NotStarted" or "InProgress")
            .Take(5).ToList();

        return new TeacherEnhancedDashboardDto
        {
            TodayTotalPeriods        = todayScheduleList.Count,
            TodayCompletedPeriods    = todayCompleted,
            TodayPendingPeriods      = todayPending,
            TodayMissedPeriods       = todayMissed,
            TotalStudentsAssigned    = totalStudents,
            WeakStudentsCount        = weakStudents,
            OverallSyllabusCompletion= syllabusCompletion,
            WeakTopicsCount          = allWeakTopics.Count,
            AttendanceSummaryPercent = attendancePct,
            GradeProgressList        = gradeProgressList,
            TodaySchedule            = todayScheduleList,
            UpcomingPeriods          = upcomingPeriods
        };
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private async Task<List<Grade>> GetTeacherGradesAsync(Guid teacherId)
    {
        // A teacher's grades are determined by Scheduler entries OR ClassTeacherGrades OR school assignments
        var schedulers = await _schedulerRepo.GetAllAsync(q =>
            q.Where(s => s.TeacherId == teacherId));
        var schedulerGradeIds = schedulers.Select(s => s.GradeId).Distinct().ToHashSet();

        // Also include grades where the teacher is ClassTeacher
        var classTeacherGrades = await _gradeRepo.GetAllAsync(q =>
            q.Where(g => g.ClassTeacherId == teacherId && g.IsActive));
        var classTeacherGradeIds = classTeacherGrades.Select(g => g.Id).ToHashSet();

        // Also include all grades from the teacher's assigned schools (via TeacherSchools table)
        var schoolGradeIds = new HashSet<Guid>();
        var teacher = (await _teacherRepo.GetAllAsync(q =>
            q.Where(t => t.Id == teacherId)
             .Include(t => t.TeacherSchools)))
            .FirstOrDefault();

        if (teacher != null)
        {
            var schoolIds = teacher.TeacherSchools
                .Where(ts => ts.IsActive && !ts.IsDeleted)
                .Select(ts => ts.SchoolId)
                .ToList();

            if (!schoolIds.Contains(teacher.SchoolId))
            {
                schoolIds.Add(teacher.SchoolId);
            }

            var schoolGrades = await _gradeRepo.GetAllAsync(q =>
                q.Where(g => g.SchoolId.HasValue && schoolIds.Contains(g.SchoolId.Value) && g.IsActive));

            foreach (var sg in schoolGrades)
            {
                schoolGradeIds.Add(sg.Id);
            }
        }

        // Merge all sets
        var allGradeIds = schedulerGradeIds
            .Union(classTeacherGradeIds)
            .Union(schoolGradeIds)
            .ToHashSet();

        if (!allGradeIds.Any())
            return classTeacherGrades; // fallback

        return await _gradeRepo.GetAllAsync(q =>
            q.Where(g => allGradeIds.Contains(g.Id) && g.IsActive)
             .OrderBy(g => g.GradeLevel));
    }

    private async Task<List<TeacherGradeSectionCombination>> GetTeacherGradeSectionCombinationsAsync(Guid teacherId)
    {
        var result = new List<TeacherGradeSectionCombination>();

        // 1. From Scheduler
        var schedulers = await _schedulerRepo.GetAllAsync(q =>
            q.Where(s => s.TeacherId == teacherId && s.IsActive)
             .Include(s => s.Grade)
             .Include(s => s.Section));

        foreach (var s in schedulers)
        {
            if (s.Grade == null || !s.Grade.IsActive) continue;
            if (s.Section != null && !s.Section.IsActive) continue;

            if (!result.Any(r => r.Grade.Id == s.GradeId && r.Section?.Id == s.SectionId))
            {
                result.Add(new TeacherGradeSectionCombination
                {
                    Grade = s.Grade,
                    Section = s.Section
                });
            }
        }

        // 2. From Class Teacher Grades
        var classTeacherGrades = await _gradeRepo.GetAllAsync(q =>
            q.Where(g => g.ClassTeacherId == teacherId && g.IsActive));

        if (classTeacherGrades.Any())
        {
            var classTeacherGradeIds = classTeacherGrades.Select(g => g.Id).ToList();
            var sections = await _sectionRepo.GetAllAsync(q =>
                q.Where(s => classTeacherGradeIds.Contains(s.GradeId) && s.IsActive)
                 .Include(s => s.Grade));

            foreach (var sec in sections)
            {
                if (!result.Any(r => r.Grade.Id == sec.GradeId && r.Section?.Id == sec.Id))
                {
                    result.Add(new TeacherGradeSectionCombination
                    {
                        Grade = sec.Grade,
                        Section = sec
                    });
                }
            }

            // Also support grades with no sections defined if any
            foreach (var g in classTeacherGrades)
            {
                if (!sections.Any(s => s.GradeId == g.Id) && !result.Any(r => r.Grade.Id == g.Id && r.Section == null))
                {
                    result.Add(new TeacherGradeSectionCombination
                    {
                        Grade = g,
                        Section = null
                    });
                }
            }
        }

        // 3. From Assigned Schools
        var teacher = (await _teacherRepo.GetAllAsync(q =>
            q.Where(t => t.Id == teacherId)
             .Include(t => t.TeacherSchools)))
            .FirstOrDefault();

        if (teacher != null)
        {
            var schoolIds = teacher.TeacherSchools
                .Where(ts => ts.IsActive && !ts.IsDeleted)
                .Select(ts => ts.SchoolId)
                .ToList();

            if (!schoolIds.Contains(teacher.SchoolId))
            {
                schoolIds.Add(teacher.SchoolId);
            }

            var schoolGrades = await _gradeRepo.GetAllAsync(q =>
                q.Where(g => g.SchoolId.HasValue && schoolIds.Contains(g.SchoolId.Value) && g.IsActive));

            if (schoolGrades.Any())
            {
                var schoolGradeIds = schoolGrades.Select(g => g.Id).ToList();
                var sections = await _sectionRepo.GetAllAsync(q =>
                    q.Where(s => schoolGradeIds.Contains(s.GradeId) && s.IsActive)
                     .Include(s => s.Grade));

                foreach (var sec in sections)
                {
                    if (!result.Any(r => r.Grade.Id == sec.GradeId && r.Section?.Id == sec.Id))
                    {
                        result.Add(new TeacherGradeSectionCombination
                        {
                            Grade = sec.Grade,
                            Section = sec
                        });
                    }
                }

                foreach (var g in schoolGrades)
                {
                    if (!sections.Any(s => s.GradeId == g.Id) && !result.Any(r => r.Grade.Id == g.Id && r.Section == null))
                    {
                        result.Add(new TeacherGradeSectionCombination
                        {
                            Grade = g,
                            Section = null
                        });
                    }
                }
            }
        }

        // Sort combinations: GradeLevel ascending, then SectionCode ascending
        return result
            .OrderBy(r => r.Grade.GradeLevel)
            .ThenBy(r => r.Section?.SectionCode ?? "")
            .ToList();
    }
}

public class TeacherGradeSectionCombination
{
    public Grade Grade { get; set; } = null!;
    public GradeSection? Section { get; set; }
}
