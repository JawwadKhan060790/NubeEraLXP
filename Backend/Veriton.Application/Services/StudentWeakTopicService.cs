using Microsoft.EntityFrameworkCore;
using Veriton.Application.DTOs;
using Veriton.Application.Interfaces.Repositories;
using Veriton.Application.Interfaces.Services;
using Veriton.Domain.Entities;

namespace Veriton.Application.Services;

public class StudentWeakTopicService : IStudentWeakTopicService
{
    private readonly IGenericRepository<StudentWeakTopic> _weakTopicRepo;
    private readonly IGenericRepository<Student>          _studentRepo;
    private readonly IGenericRepository<Grade>            _gradeRepo;
    private readonly IGenericRepository<Module>           _moduleRepo;
    private readonly IGenericRepository<Lesson>           _lessonRepo;
    private readonly IGenericRepository<Result>           _resultRepo;
    private readonly IGenericRepository<Exam>             _examRepo;

    public StudentWeakTopicService(
        IGenericRepository<StudentWeakTopic> weakTopicRepo,
        IGenericRepository<Student>          studentRepo,
        IGenericRepository<Grade>            gradeRepo,
        IGenericRepository<Module>           moduleRepo,
        IGenericRepository<Lesson>           lessonRepo,
        IGenericRepository<Result>           resultRepo,
        IGenericRepository<Exam>             examRepo)
    {
        _weakTopicRepo = weakTopicRepo;
        _studentRepo   = studentRepo;
        _gradeRepo     = gradeRepo;
        _moduleRepo    = moduleRepo;
        _lessonRepo    = lessonRepo;
        _resultRepo    = resultRepo;
        _examRepo      = examRepo;
    }

    // ── Student weakness analysis ────────────────────────────────────────────

    public async Task<StudentWeaknessAnalysisDto> GetStudentWeaknessAsync(Guid studentId)
    {
        var student = await _studentRepo.GetByIdAsync(studentId)
            ?? throw new KeyNotFoundException("Student not found.");

        // Self-heal: pick up any failed exams that haven't been synced into
        // StudentWeakTopic yet, so this view never depends on someone
        // remembering to click "Sync from Results".
        try { await SyncFromResultsAsync(student.GradeId, student.SchoolId); }
        catch (Exception) { /* never block the read on a sync failure */ }

        var weakTopics = await _weakTopicRepo.GetAllAsync(q =>
            q.Where(w => w.StudentId == studentId)
             .Include(w => w.Grade)
             .Include(w => w.Module)
             .Include(w => w.Lesson));

        var topicDtos = weakTopics.Select(w => MapToDto(w, student)).ToList();

        return new StudentWeaknessAnalysisDto
        {
            StudentId       = studentId,
            StudentName     = $"{student.FirstName} {student.LastName}",
            GradeName       = weakTopics.FirstOrDefault()?.Grade?.GradeName ?? "",
            TotalWeakTopics = topicDtos.Count,
            HighWeakness    = topicDtos.Count(t => t.WeaknessLevel == "High"),
            MediumWeakness  = topicDtos.Count(t => t.WeaknessLevel == "Medium"),
            LowWeakness     = topicDtos.Count(t => t.WeaknessLevel == "Low"),
            ResolvedCount   = topicDtos.Count(t => t.IsResolved),
            WeakTopics      = topicDtos.OrderByDescending(t => t.WeaknessLevel).ToList()
        };
    }

    // ── Grade weakness analysis ──────────────────────────────────────────────

    public async Task<GradeWeaknessAnalysisDto> GetGradeWeaknessAsync(Guid gradeId, Guid? sectionId = null)
    {
        var grade = await _gradeRepo.GetByIdAsync(gradeId)
            ?? throw new KeyNotFoundException("Grade not found.");

        // Self-heal: pick up any failed exams that haven't been synced into
        // StudentWeakTopic yet, so this view never depends on someone
        // remembering to click "Sync from Results".
        try { await SyncFromResultsAsync(gradeId, grade.SchoolId); }
        catch (Exception) { /* never block the read on a sync failure */ }

        var students = await _studentRepo.GetAllAsync(q =>
            q.Where(s => s.GradeId == gradeId && s.IsActive && (!sectionId.HasValue || s.SectionId == sectionId.Value)));

        var studentIds = students.Select(s => s.Id).ToHashSet();

        var allWeakTopics = await _weakTopicRepo.GetAllAsync(q =>
            q.Where(w => studentIds.Contains(w.StudentId))
             .Include(w => w.Module)
             .Include(w => w.Lesson));

        // Top weak topics (by number of affected students)
        var topWeakTopics = allWeakTopics
            .Where(w => !w.IsResolved)
            .GroupBy(w => w.LessonId)
            .Select(g =>
            {
                var first = g.First();
                return new TopicWeaknessSummaryDto
                {
                    LessonId         = g.Key,
                    TopicName        = first.Lesson?.SubTopic ?? "",
                    ModuleName       = first.Module?.Name ?? "",
                    AffectedStudents = g.Select(w => w.StudentId).Distinct().Count(),
                    AverageScore     = g.Count() == 0 ? 0 :
                        Math.Round((double)g.Average(w => w.MaxScore == 0 ? 0 : (double)w.Score / (double)w.MaxScore * 100), 1)
                };
            })
            .OrderByDescending(t => t.AffectedStudents)
            .Take(10)
            .ToList();

        // Per-student weakness
        var studentWeaknessMap = allWeakTopics.GroupBy(w => w.StudentId).ToDictionary(g => g.Key, g => g.ToList());

        var studentDtos = students.Select(s =>
        {
            studentWeaknessMap.TryGetValue(s.Id, out var sWeakTopics);
            sWeakTopics ??= new List<StudentWeakTopic>();
            var topicDtos = sWeakTopics.Select(w => MapToDto(w, s)).ToList();

            return new StudentWeaknessAnalysisDto
            {
                StudentId       = s.Id,
                StudentName     = $"{s.FirstName} {s.LastName}",
                GradeName       = grade.GradeName,
                TotalWeakTopics = topicDtos.Count,
                HighWeakness    = topicDtos.Count(t => t.WeaknessLevel == "High"),
                MediumWeakness  = topicDtos.Count(t => t.WeaknessLevel == "Medium"),
                LowWeakness     = topicDtos.Count(t => t.WeaknessLevel == "Low"),
                ResolvedCount   = topicDtos.Count(t => t.IsResolved),
                WeakTopics      = topicDtos
            };
        }).OrderByDescending(s => s.TotalWeakTopics).ToList();

        return new GradeWeaknessAnalysisDto
        {
            GradeId            = gradeId,
            GradeName          = grade.GradeName,
            TotalWeakInstances = allWeakTopics.Count,
            TopWeakTopics      = topWeakTopics,
            Students           = studentDtos
        };
    }

    // ── Create (teacher manual) ──────────────────────────────────────────────

    public async Task<Guid> CreateAsync(CreateStudentWeakTopicDto dto)
    {
        var student = await _studentRepo.GetByIdAsync(dto.StudentId)
            ?? throw new KeyNotFoundException("Student not found.");

        if (!Enum.TryParse<WeaknessLevel>(dto.WeaknessLevel, true, out var levelEnum))
            levelEnum = WeaknessLevel.Medium;
        if (!Enum.TryParse<WeaknessSource>(dto.Source, true, out var sourceEnum))
            sourceEnum = WeaknessSource.Teacher;

        var entity = new StudentWeakTopic
        {
            SchoolId           = student.SchoolId,
            StudentId          = dto.StudentId,
            GradeId            = dto.GradeId,
            ModuleId           = dto.ModuleId,
            LessonId           = dto.LessonId,
            WeaknessLevel      = levelEnum,
            Source             = sourceEnum,
            Score              = dto.Score,
            MaxScore           = dto.MaxScore,
            LastAssessmentDate = DateTime.UtcNow,
            RecommendedRevision= dto.RecommendedRevision
        };
        await _weakTopicRepo.AddAsync(entity);
        return entity.Id;
    }

    // ── Resolve ──────────────────────────────────────────────────────────────

    public async Task ResolveAsync(Guid weakTopicId)
    {
        var entity = await _weakTopicRepo.GetByIdAsync(weakTopicId)
            ?? throw new KeyNotFoundException("Weak topic record not found.");
        entity.IsResolved = true;
        entity.ResolvedAt = DateTime.UtcNow;
        await _weakTopicRepo.UpdateAsync(entity);
    }

    // ── Sync from Results ────────────────────────────────────────────────────

    public async Task SyncFromResultsAsync(Guid gradeId, Guid? schoolId)
    {
        var students = await _studentRepo.GetAllAsync(q =>
            q.Where(s => s.GradeId == gradeId && s.IsActive));
        var studentIds = students.Select(s => s.Id).ToHashSet();

        // Load all results for grade's students that failed
        var exams = await _examRepo.GetAllAsync(q =>
            q.Where(e => e.GradeId == gradeId)
             .Include(e => e.Module).ThenInclude(m => m.Lessons));

        var examIds = exams.Select(e => e.Id).ToHashSet();

        var allResults = await _resultRepo.GetAllAsync(q =>
            q.Where(r => studentIds.Contains(r.StudentId) && examIds.Contains(r.ExamId)));

        // Mutable working list: as new/updated rows are produced below, they're
        // appended/kept here so a second failed result mapping to the same
        // student+lesson within this same sync pass is matched as "existing"
        // instead of inserted as a duplicate.
        var existingWeakTopics = (await _weakTopicRepo.GetAllAsync(q =>
            q.Where(w => studentIds.Contains(w.StudentId)))).ToList();

        foreach (var result in allResults)
        {
            var exam = exams.FirstOrDefault(e => e.Id == result.ExamId);
            if (exam == null) continue;

            decimal passingMarks = exam.PassingMarks ?? (int)Math.Ceiling((exam.TotalMarks ?? 100) * 0.40);
            if (result.ObtainedMarks >= passingMarks) continue; // passed — no weakness

            // Exams aren't always tagged with a specific Lesson (it's an optional
            // field when the exam is created). Fall back to the first active
            // Lesson of the exam's Module so a failure still surfaces as a
            // weak topic instead of being silently dropped.
            Guid? lessonId = exam.LessonId ?? exam.Module?.Lessons
                ?.Where(l => l.IsActive)
                 .OrderBy(l => l.DisplayOrder)
                 .ThenBy(l => l.SerialNumber)
                .Select(l => (Guid?)l.Id)
                .FirstOrDefault();
            if (!lessonId.HasValue) continue; // module has no lessons to anchor this to

            var existing = existingWeakTopics.FirstOrDefault(w =>
                w.StudentId == result.StudentId && w.LessonId == lessonId.Value);

            decimal maxScore = exam.TotalMarks ?? 100;
            double scoreRatio = maxScore == 0 ? 0 : (double)result.ObtainedMarks / (double)maxScore;
            WeaknessLevel level = scoreRatio >= 0.35 ? WeaknessLevel.Low :
                                  scoreRatio >= 0.20 ? WeaknessLevel.Medium : WeaknessLevel.High;

            var student = students.FirstOrDefault(s => s.Id == result.StudentId);
            if (student == null) continue;

            if (existing == null)
            {
                var created = new StudentWeakTopic
                {
                    SchoolId           = student.SchoolId,
                    StudentId          = result.StudentId,
                    GradeId            = gradeId,
                    ModuleId           = exam.ModuleId,
                    LessonId           = lessonId.Value,
                    WeaknessLevel      = level,
                    Source             = WeaknessSource.Exam,
                    Score              = result.ObtainedMarks,
                    MaxScore           = maxScore,
                    Attempts           = 1,
                    LastAssessmentDate = result.CreatedAt
                };
                await _weakTopicRepo.AddAsync(created);
                existingWeakTopics.Add(created);
            }
            else if (!existing.IsResolved)
            {
                // Update to worst (highest) level seen
                if (level > existing.WeaknessLevel) existing.WeaknessLevel = level;
                existing.Score = result.ObtainedMarks;
                existing.MaxScore = maxScore;
                existing.Attempts++;
                existing.LastAssessmentDate = result.CreatedAt > existing.LastAssessmentDate
                    ? result.CreatedAt : existing.LastAssessmentDate;
                await _weakTopicRepo.UpdateAsync(existing);
            }
            else
            {
                // Previously marked resolved, but the student has failed this
                // topic again — reopen it instead of leaving it hidden.
                existing.IsResolved         = false;
                existing.ResolvedAt         = null;
                existing.WeaknessLevel      = level;
                existing.Score              = result.ObtainedMarks;
                existing.MaxScore           = maxScore;
                existing.Attempts++;
                existing.LastAssessmentDate = result.CreatedAt;
                await _weakTopicRepo.UpdateAsync(existing);
            }
        }
    }

    // ── Mapping helper ────────────────────────────────────────────────────────

    private static StudentWeakTopicDto MapToDto(StudentWeakTopic w, Student student) => new()
    {
        Id                  = w.Id,
        StudentId           = w.StudentId,
        StudentName         = $"{student.FirstName} {student.LastName}",
        GradeId             = w.GradeId,
        GradeName           = w.Grade?.GradeName ?? "",
        ModuleId            = w.ModuleId,
        ModuleName          = w.Module?.Name ?? "",
        LessonId            = w.LessonId,
        LessonName          = w.Lesson?.SubTopic ?? "",
        WeaknessLevel       = w.WeaknessLevel.ToString(),
        Source              = w.Source.ToString(),
        Score               = w.Score,
        MaxScore            = w.MaxScore,
        Attempts            = w.Attempts,
        LastAssessmentDate  = w.LastAssessmentDate,
        RecommendedRevision = w.RecommendedRevision,
        IsResolved          = w.IsResolved,
        ResolvedAt          = w.ResolvedAt
    };
}
