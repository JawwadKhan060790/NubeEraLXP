using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Repositories;
using NubeEra.Application.Interfaces.Services;
using NubeEra.Application.Interfaces.Security;
using NubeEra.Domain.Entities;
using NubeEra.Domain.Common;

namespace NubeEra.Application.Services;

public class ParentService : IParentService
{
    private readonly IGenericRepository<Student> _studentRepository;
    private readonly IGenericRepository<LessonCompletion> _completionRepository;
    private readonly IGenericRepository<Lesson> _lessonRepository;
    private readonly IGenericRepository<Module> _moduleRepository;
    private readonly IUserRepository _userRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IGenericRepository<Result> _resultRepository;

    public ParentService(
        IGenericRepository<Student> studentRepository,
        IGenericRepository<LessonCompletion> completionRepository,
        IGenericRepository<Lesson> lessonRepository,
        IGenericRepository<Module> moduleRepository,
        IUserRepository userRepository,
        ICurrentUserService currentUserService,
        IGenericRepository<Result> resultRepository)
    {
        _studentRepository = studentRepository;
        _completionRepository = completionRepository;
        _lessonRepository = lessonRepository;
        _moduleRepository = moduleRepository;
        _userRepository = userRepository;
        _currentUserService = currentUserService;
        _resultRepository = resultRepository;
    }

    public async Task<ParentDashboardDto> GetParentDashboardAsync(string? statusFilter = null)
    {
        var parentDashboard = new ParentDashboardDto();
        
        var userIdStr = _currentUserService.UserId;
        if (string.IsNullOrEmpty(userIdStr))
        {
            return parentDashboard;
        }

        var parentUser = await _userRepository.GetByIdAsync(Guid.Parse(userIdStr));
        if (parentUser == null || string.IsNullOrEmpty(parentUser.Phone))
        {
            return parentDashboard;
        }

        var parentPhone = parentUser.Phone.Trim();
        var normalizedParentPhone = NormalizePhoneForMatching(parentPhone);

        // Fetch active students with a non-null guardian phone (DB-side filter — IsActive
        // exclusion explained below), then resolve the actual match in memory using
        // NormalizePhoneForMatching. We can't push the normalization itself into SQL
        // (the EF/MySQL provider can't translate the digit-stripping + suffix comparison),
        // so we narrow with the cheap DB predicates first and do the precise compare here.
        //
        // IMPORTANT: exclude deactivated/deleted students (IsActive == false). Student
        // removal is a soft delete (see StudentService.DeleteAsync / UsersController.Delete),
        // and without this filter a removed child's progress/results kept showing up on
        // the parent dashboard indefinitely - contradicting the requirement that parent
        // dashboards reflect a student's deletion/deactivation.
        var candidates = await _studentRepository.GetAllAsync(q => q
            .Include(s => s.Grade)
            .Include(s => s.School)
            .Include(s => s.Section)
            .Where(s => s.IsActive && s.ParentGuardianPhone != null && s.ParentGuardianPhone.Trim() != ""));

        // Match using normalized phone numbers so that purely cosmetic differences in
        // formatting — spaces, dashes, parentheses, a leading "+", or a leading national
        // trunk/country-code prefix — don't cause a real parent-child link to be missed.
        // (See QA finding: "Parent-student linkage integrity (phone-based matching)".)
        var children = candidates
            .Where(s => PhonesLikelyMatch(normalizedParentPhone, NormalizePhoneForMatching(s.ParentGuardianPhone!)))
            .ToList();

        if (!children.Any())
        {
            return parentDashboard;
        }

        var studentIds = children.Select(c => c.Id).ToList();

        // Units/Topics are now keyed by the master GradeLevelId rather than a
        // student's per-school Grade.Id — resolve via the already-Included Grade nav.
        var gradeLevelIds = children
            .Where(c => c.Grade != null && c.Grade.GradeLevelId.HasValue)
            .Select(c => c.Grade.GradeLevelId!.Value)
            .Distinct()
            .ToList();

        // Fetch completions for these students
        var completions = await _completionRepository.GetAllAsync(q =>
            q.Where(c => studentIds.Contains(c.StudentId)));

        // Units/Topics are master content shared across every school at a grade
        // level, made visible to a specific school only via the admin/staff
        // Curriculum Assignment screen (SchoolUnitAssignment / SchoolTopicAssignment).
        // Without this filter, a unit unchecked/unassigned for a child's school still
        // showed up on the parent dashboard, ignoring the assignment entirely.
        var schoolIds = children.Select(c => c.SchoolId).Distinct().ToList();

        // Fetch modules for the children's grade levels, restricted to units
        // actually assigned to at least one of the children's schools.
        var modules = await _moduleRepository.GetAllAsync(q =>
            q.Include(m => m.SchoolAssignments)
             .Where(m => gradeLevelIds.Contains(m.GradeLevelId) && m.IsActive
                      && m.SchoolAssignments.Any(a => !a.IsDeleted && schoolIds.Contains(a.SchoolId))));

        // Fetch lessons for the children's grade levels, same school-assignment guard.
        var lessons = await _lessonRepository.GetAllAsync(q =>
            q.Include(l => l.Module)
             .Include(l => l.SchoolAssignments)
             .Where(l => gradeLevelIds.Contains(l.Module.GradeLevelId) && l.IsActive
                      && l.SchoolAssignments.Any(a => !a.IsDeleted && schoolIds.Contains(a.SchoolId))));

        foreach (var child in children)
        {
            var childCompletions = completions.Where(c => c.StudentId == child.Id).Select(c => c.LessonId).ToHashSet();
            var childGradeLevelId = child.Grade?.GradeLevelId;

            // Lessons belonging to the student's grade level AND assigned to this
            // specific child's school (handles a parent whose children attend
            // different schools, where a unit may be assigned to one but not the other).
            var childGradeLessons = childGradeLevelId.HasValue
                ? lessons.Where(l => l.Module.GradeLevelId == childGradeLevelId.Value
                                  && l.SchoolAssignments.Any(a => !a.IsDeleted && a.SchoolId == child.SchoolId))
                         .GroupBy(l => l.Id)
                         .Select(g => g.First())
                         .ToList()
                : new List<Lesson>();
            var totalLessonsCount = childGradeLessons.Count;
            var completedLessonsCount = childGradeLessons.Count(l => childCompletions.Contains(l.Id));
            
            var progressPercent = totalLessonsCount == 0 
                ? 0 
                : Math.Round((double)completedLessonsCount / totalLessonsCount * 100, 2);

            var childProgressDto = new ParentChildProgressDto
            {
                Id = child.Id,
                StudentId = child.StudentId,
                FirstName = child.FirstName,
                LastName = child.LastName,
                FullName = $"{child.FirstName} {child.LastName}",
                GradeName = child.Grade?.GradeName ?? "N/A",
                SchoolName = child.School?.Name ?? "N/A",
                SectionCode = child.Section?.SectionCode,
                SectionName = child.Section?.SectionName,
                TotalLessonsCount = totalLessonsCount,
                CompletedLessonsCount = completedLessonsCount,
                ProgressPercentage = progressPercent
            };

            // Module-wise / Chapter-wise breakdown — same per-child school-assignment guard.
            var childGradeModules = childGradeLevelId.HasValue
                ? modules.Where(m => m.GradeLevelId == childGradeLevelId.Value
                                  && m.SchoolAssignments.Any(a => !a.IsDeleted && a.SchoolId == child.SchoolId))
                         .GroupBy(m => m.Id)
                         .Select(g => g.First())
                         .ToList()
                : new List<Module>();
            foreach (var module in childGradeModules)
            {
                var moduleLessons = childGradeLessons.Where(l => l.ModuleId == module.Id).ToList();
                var moduleTotal = moduleLessons.Count;
                var moduleCompleted = moduleLessons.Count(l => childCompletions.Contains(l.Id));
                var moduleProgressPercent = moduleTotal == 0 
                    ? 0 
                    : Math.Round((double)moduleCompleted / moduleTotal * 100, 2);

                if (!string.IsNullOrEmpty(statusFilter) && statusFilter != "All")
                {
                    if (statusFilter == "Completed" && moduleProgressPercent < 100) continue;
                    if (statusFilter == "Active" && moduleProgressPercent == 100) continue;
                }

                childProgressDto.Modules.Add(new ParentModuleProgressDto
                {
                    ModuleId = module.Id,
                    ModuleName = module.Name,
                    TotalLessonsCount = moduleTotal,
                    CompletedLessonsCount = moduleCompleted,
                    ProgressPercentage = moduleProgressPercent
                });
            }

            // Fetch child failed results
            var childResults = await _resultRepository.GetAllAsync(q => q
                .Include(r => r.Exam)
                .ThenInclude(e => e.Module)
                .Where(r => r.StudentId == child.Id));

            childProgressDto.FailedUnits = childResults
                .Where(r => r.Remarks == "FAILED" || (r.Exam != null && r.ObtainedMarks < (r.Exam.PassingMarks ?? (int)Math.Ceiling((r.Exam.TotalMarks ?? 0) * 0.40))))
                .Select(r => new FailedUnitDto
                {
                    ModuleId = r.Exam?.ModuleId ?? Guid.Empty,
                    ModuleName = r.Exam?.Module?.Name ?? "Unknown Module",
                    ExamTitle = r.Exam?.Title ?? "Unit Test",
                    ObtainedMarks = r.ObtainedMarks,
                    TotalMarks = r.Exam?.TotalMarks ?? 0,
                    PassingMarks = r.Exam?.PassingMarks ?? (int)Math.Ceiling((r.Exam?.TotalMarks ?? 0) * 0.40)
                }).ToList();

            parentDashboard.Children.Add(childProgressDto);
        }

        return parentDashboard;
    }

    /// <summary>
    /// Strips every non-digit character from a phone number (spaces, dashes, dots,
    /// parentheses, a leading "+", etc.), leaving only the raw digit sequence. This
    /// is the first step in tolerating cosmetic formatting differences between the
    /// Parent's User.Phone and a Student's ParentGuardianPhone — two values that, in
    /// the current data model, are matched purely as free-text strings (see QA finding
    /// "Parent-student linkage integrity (phone-based matching)").
    /// </summary>
    private static string NormalizePhoneForMatching(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return string.Empty;
        var digitsOnly = new string(phone.Where(char.IsDigit).ToArray());
        return digitsOnly;
    }

    /// <summary>
    /// Compares two digit-only phone strings for a likely match while tolerating a
    /// leading national trunk code ("0") or country-calling-code prefix that may be
    /// present on one side but not the other (e.g., "03001234567" vs "923001234567"
    /// vs "+923001234567" should all be recognized as the same number). We do this by
    /// comparing the trailing "core" digits (the longest common suffix length, capped
    /// at a typical local-number length) rather than requiring exact full-string equality.
    ///
    /// This is a pragmatic, no-schema-change mitigation. It intentionally tolerates a
    /// small amount of ambiguity (e.g., two genuinely different numbers that happen to
    /// share the same last 9-10 digits would be treated as a match) in exchange for
    /// fixing the much more common real-world failure mode — legitimate parent-child
    /// links being missed due to formatting differences. The QA report's recommended
    /// long-term fix (an explicit, validated ParentStudentLink relationship) remains the
    /// correct permanent solution.
    /// </summary>
    private static bool PhonesLikelyMatch(string normalizedA, string normalizedB)
    {
        if (string.IsNullOrEmpty(normalizedA) || string.IsNullOrEmpty(normalizedB)) return false;

        // Exact match after stripping formatting — the common case.
        if (normalizedA == normalizedB) return true;

        const int coreLength = 9; // typical local-subscriber-number length, excluding trunk/country code
        if (normalizedA.Length < coreLength || normalizedB.Length < coreLength) return false;

        var coreA = normalizedA[^coreLength..];
        var coreB = normalizedB[^coreLength..];
        return coreA == coreB;
    }
}
