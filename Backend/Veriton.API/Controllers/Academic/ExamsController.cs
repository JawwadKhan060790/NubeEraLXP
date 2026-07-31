using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;
using Veriton.Application.Common.Export;
using Veriton.Application.DTOs;
using Veriton.Application.Interfaces.Repositories;
using Veriton.Application.Interfaces.Services;
using Veriton.Application.Interfaces.Services.Export;
using Veriton.Application.Interfaces.Security;
using Veriton.Domain.Entities;
using Veriton.Domain.Common;

namespace Veriton.API.Controllers.Academic;

[ApiController]
[Route("api/exams")]
[Authorize]
public class ExamsController : ControllerBase
{
    private readonly IGenericService<ExamCreateDto, ExamUpdateDto, ExamDto> _service;
    private readonly IGenericRepository<Question> _questionRepository;
    private readonly IGenericRepository<Result> _resultRepository;
    private readonly IGenericRepository<Student> _studentRepository;
    private readonly IGenericRepository<Exam> _examRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IExcelExportService _excelExportService;
    private readonly IStudentWeakTopicService _weakTopicService;
    private readonly IGenericRepository<LessonCompletion> _completionRepository;
    private readonly IGenericRepository<Lesson> _lessonRepository;

    private static readonly IReadOnlyList<ExportColumnDefinition> ExamExportColumns = new List<ExportColumnDefinition>
    {
        ExportColumnDefinition.Text("title", "Exam Title", 32),
        ExportColumnDefinition.Text("grade_name", "Grade", 20),
        ExportColumnDefinition.Text("module_name", "Unit (Module)", 26),
        ExportColumnDefinition.Text("lesson_name", "Topic", 26),
        ExportColumnDefinition.DateTime("date", "Scheduled Date", 20),
        ExportColumnDefinition.Number("duration_minutes", "Duration (Mins)", 16),
        ExportColumnDefinition.Number("total_marks", "Total Marks", 14),
        ExportColumnDefinition.Number("passing_marks", "Passing Marks", 14),
        ExportColumnDefinition.Number("question_count", "Questions", 12),
        ExportColumnDefinition.Text("created_by_teacher_name", "Created By", 24),
        ExportColumnDefinition.Boolean("is_active", "Active", 10),
    };

    public ExamsController(
        IGenericService<ExamCreateDto, ExamUpdateDto, ExamDto> service,
        IGenericRepository<Question> questionRepository,
        IGenericRepository<Result> resultRepository,
        IGenericRepository<Student> studentRepository,
        IGenericRepository<Exam> examRepository,
        ICurrentUserService currentUserService,
        IExcelExportService excelExportService,
        IStudentWeakTopicService weakTopicService,
        IGenericRepository<LessonCompletion> completionRepository,
        IGenericRepository<Lesson> lessonRepository)
    {
        _service = service;
        _questionRepository = questionRepository;
        _resultRepository = resultRepository;
        _studentRepository = studentRepository;
        _examRepository = examRepository;
        _currentUserService = currentUserService;
        _excelExportService = excelExportService;
        _weakTopicService = weakTopicService;
        _completionRepository = completionRepository;
        _lessonRepository = lessonRepository;
    }

    /// <summary>
    /// Get all exams. Accessible by all authenticated roles.
    /// Students can view exams.
    /// </summary>
    [HttpGet]
    [Authorize(Policy = "StudentOnly")]
    public async Task<IActionResult> GetAll()
        => Ok(await _service.GetAllAsync());

    [HttpGet("export")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> Export()
    {
        var exams = await _service.GetAllAsync();
        var rows = exams.Select(e => (IReadOnlyDictionary<string, object?>)new Dictionary<string, object?>
        {
            ["title"] = e.Title,
            ["grade_name"] = e.GradeName,
            ["module_name"] = e.ModuleName,
            ["lesson_name"] = e.LessonName,
            ["date"] = e.Date,
            ["duration_minutes"] = (object?)e.DurationMinutes,
            ["total_marks"] = (object?)e.TotalMarks,
            ["passing_marks"] = (object?)e.PassingMarks,
            ["question_count"] = (object?)e.QuestionCount,
            ["created_by_teacher_name"] = e.CreatedByTeacherName,
            ["is_active"] = e.IsActive,
        }).ToList();
        var configuration = ExportConfiguration.Create(
            fileName: $"exams-export-{DateTime.UtcNow:yyyyMMdd-HHmmss}",
            sheetName: "Exams",
            columns: ExamExportColumns,
            title: "MCQ Exam Directory");
        var fileBytes = _excelExportService.GenerateExcel(rows, configuration);
        return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"{configuration.FileName}.xlsx");
    }

    [HttpGet("{id}")]
    [Authorize(Policy = "StudentOnly")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var exam = await _service.GetByIdAsync(id);
        return exam == null ? NotFound() : Ok(exam);
    }

    [HttpPost]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> Create(ExamCreateDto dto)
        => Ok(new { id = await _service.CreateAsync(dto) });

    [HttpPut("{id}")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> Update(Guid id, ExamUpdateDto dto)
    {
        await _service.UpdateAsync(id, dto);
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }

    /// <summary>
    /// Submit student MCQ answers for auto-evaluation.
    /// </summary>
    [HttpPost("{id}/submit")]
    [Authorize(Policy = "StudentOnly")]
    public async Task<IActionResult> SubmitExam(Guid id, [FromBody] ExamSubmissionDto submission)
    {
        // Prefer direct StudentId claim (immune to nullable UserId on Student entity).
        var studentId = _currentUserService.StudentId;
        Student? student = null;

        if (studentId.HasValue)
        {
            student = await _studentRepository.GetByIdAsync(studentId.Value);
        }

        if (student == null)
        {
            // Fall back to UserId-based lookup for backward-compat.
            var userIdStr = _currentUserService.UserId;
            if (!string.IsNullOrEmpty(userIdStr))
            {
                var userId = Guid.Parse(userIdStr);
                var all = await _studentRepository.GetAllAsync(q => q.Where(s => s.UserId == userId));
                student = all.FirstOrDefault();
            }
        }

        if (student == null)
        {
            return BadRequest(new { message = "Student profile not found." });
        }

        var exam = await _examRepository.GetByIdAsync(id, q => q.Include(e => e.Questions));
        if (exam == null)
        {
            return NotFound(new { message = "Exam not found." });
        }

        if (exam.Date > DateTime.UtcNow)
        {
            return BadRequest(new { message = $"This exam is scheduled for {exam.Date:yyyy-MM-dd HH:mm} UTC and cannot be taken or submitted before the release date and time." });
        }

        if (exam.Questions == null || exam.Questions.Count == 0)
        {
            return BadRequest(new { message = "Exam has no questions." });
        }

        int correctCount = 0;
        foreach (var ans in submission.Answers)
        {
            var question = exam.Questions.FirstOrDefault(q => q.Id == ans.QuestionId);
            if (question != null && !string.IsNullOrEmpty(question.CorrectAnswer) && 
                question.CorrectAnswer.Trim().Equals(ans.SelectedOption.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                correctCount++;
            }
        }

        var totalMarks = exam.TotalMarks ?? exam.Questions.Count;
        var passingMarks = exam.PassingMarks ?? (int)Math.Ceiling(totalMarks * 0.40); // Default 40% passing
        
        decimal obtainedMarks = 0;
        if (exam.Questions.Count > 0)
        {
            obtainedMarks = Math.Round((decimal)correctCount / exam.Questions.Count * totalMarks, 2);
        }

        bool isPassed = obtainedMarks >= passingMarks;
        var remark = isPassed ? "PASSED" : "FAILED";

        var percentage = totalMarks == 0 ? 0 : (double)obtainedMarks / totalMarks * 100;
        string grade = "F";
        if (percentage >= 90) grade = "A+";
        else if (percentage >= 80) grade = "A";
        else if (percentage >= 70) grade = "B";
        else if (percentage >= 60) grade = "C";
        else if (percentage >= 50) grade = "D";
        else if (percentage >= 40) grade = "E";

        var result = new Result
        {
            SchoolId = exam.SchoolId,
            StudentId = student.Id,
            ExamId = exam.Id,
            ObtainedMarks = obtainedMarks,
            Grade = grade,
            Remarks = remark,
            IsPublished = true
        };

        await _resultRepository.AddAsync(result);

        if (!isPassed)
        {
            try
            {
                // Identify all Unit & Topic IDs associated with this failed exam
                var failedLessonIds = new List<Guid>();

                if (exam.LessonId.HasValue && exam.LessonId.Value != Guid.Empty)
                {
                    failedLessonIds.Add(exam.LessonId.Value);
                }

                if (exam.ModuleId != Guid.Empty)
                {
                    var moduleLessonIds = await _lessonRepository.Query()
                        .AsNoTracking()
                        .Where(l => l.ModuleId == exam.ModuleId && !l.IsDeleted)
                        .Select(l => l.Id)
                        .ToListAsync();

                    failedLessonIds.AddRange(moduleLessonIds);
                }

                if (exam.Questions != null && exam.Questions.Any())
                {
                    var questionLessonIds = exam.Questions
                        .Where(q => q.LessonId.HasValue && q.LessonId.Value != Guid.Empty)
                        .Select(q => q.LessonId!.Value);

                    failedLessonIds.AddRange(questionLessonIds);
                }

                failedLessonIds = failedLessonIds.Distinct().ToList();

                if (failedLessonIds.Any())
                {
                    // Automatically mark unit & topics as INCOMPLETE by deleting LessonCompletions so the student MUST relearn them
                    var completionsToRemove = await _completionRepository.GetAllAsync(q =>
                        q.Where(lc => lc.StudentId == student.Id && failedLessonIds.Contains(lc.LessonId)));

                    foreach (var completion in completionsToRemove)
                    {
                        await _completionRepository.HardDeleteAsync(completion);
                    }
                }

                // Record this failure as a weak topic immediately for AI & Teacher Weakness Analysis
                await _weakTopicService.SyncFromResultsAsync(exam.GradeId, exam.SchoolId);
            }
            catch (Exception)
            {
                // Never block exam submission on bookkeeping.
            }
        }

        return Ok(new {
            obtainedMarks = obtainedMarks,
            totalMarks = totalMarks,
            correctCount = correctCount,
            totalQuestions = exam.Questions.Count,
            passed = isPassed,
            grade = grade,
            remark = remark
        });
    }
}

