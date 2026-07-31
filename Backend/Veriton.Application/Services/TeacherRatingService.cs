using Microsoft.EntityFrameworkCore;
using Veriton.Application.DTOs;
using Veriton.Application.Interfaces.Repositories;
using Veriton.Application.Interfaces.Services;
using Veriton.Domain.Entities;

namespace Veriton.Application.Services;

public class TeacherRatingService : ITeacherRatingService
{
    private readonly IGenericRepository<TeacherRating> _ratingRepo;
    private readonly IGenericRepository<Student>        _studentRepo;
    private readonly IGenericRepository<Teacher>        _teacherRepo;
    private readonly IGenericRepository<Grade>           _gradeRepo;
    private readonly IGenericRepository<Scheduler>       _schedulerRepo;
    private readonly IGenericRepository<Exam>            _examRepo;

    public TeacherRatingService(
        IGenericRepository<TeacherRating> ratingRepo,
        IGenericRepository<Student>        studentRepo,
        IGenericRepository<Teacher>        teacherRepo,
        IGenericRepository<Grade>          gradeRepo,
        IGenericRepository<Scheduler>      schedulerRepo,
        IGenericRepository<Exam>           examRepo)
    {
        _ratingRepo    = ratingRepo;
        _studentRepo   = studentRepo;
        _teacherRepo   = teacherRepo;
        _gradeRepo     = gradeRepo;
        _schedulerRepo = schedulerRepo;
        _examRepo      = examRepo;
    }

    public async Task<List<RatableTeacherDto>> GetRatableTeachersAsync(Guid studentId)
    {
        var student = await _studentRepo.GetByIdAsync(studentId)
            ?? throw new KeyNotFoundException("Student not found.");

        var grade = await _gradeRepo.GetByIdAsync(student.GradeId);

        // Subject teachers: anyone scheduled to teach this grade, or who has
        // authored an exam for it — covers schools that lean on either feature.
        var schedulers = await _schedulerRepo.GetAllAsync(q =>
            q.Where(s => s.GradeId == student.GradeId && s.IsActive)
             .Include(s => s.Module));

        var exams = await _examRepo.GetAllAsync(q =>
            q.Where(e => e.GradeId == student.GradeId && e.CreatedByTeacherId.HasValue)
             .Include(e => e.Module));

        var subjectByTeacher = new Dictionary<Guid, string?>();
        foreach (var s in schedulers)
            if (!subjectByTeacher.ContainsKey(s.TeacherId))
                subjectByTeacher[s.TeacherId] = s.Module?.Name;
        foreach (var e in exams)
            if (e.CreatedByTeacherId.HasValue && !subjectByTeacher.ContainsKey(e.CreatedByTeacherId.Value))
                subjectByTeacher[e.CreatedByTeacherId.Value] = e.Module?.Name;

        // Retrieve all active teachers assigned to this school as the baseline
        var teachers = await _teacherRepo.GetAllAsync(q =>
            q.Where(t => t.IsActive && (t.SchoolId == student.SchoolId || t.TeacherSchools.Any(ts => ts.SchoolId == student.SchoolId && ts.IsActive))));

        var schoolTeacherIds = teachers.Select(t => t.Id).ToList();

        var myRatings = await _ratingRepo.GetAllAsync(q =>
            q.Where(r => r.StudentId == studentId && schoolTeacherIds.Contains(r.TeacherId)));

        return teachers.Select(t =>
        {
            var mine = myRatings.FirstOrDefault(r => r.TeacherId == t.Id);
            
            // Determine the subject: use scheduled module name, or fall back to teacher's specialization
            subjectByTeacher.TryGetValue(t.Id, out var subject);
            if (string.IsNullOrEmpty(subject))
            {
                subject = t.Specialization;
            }

            return new RatableTeacherDto
            {
                TeacherId      = t.Id,
                TeacherName    = $"{t.FirstName} {t.LastName}",
                Subject        = subject,
                IsClassTeacher = grade?.ClassTeacherId == t.Id,
                MyRating       = mine?.Rating,
                MyComment      = mine?.Comment
            };
        })
        // Prioritize: Class Teacher first, then scheduled/exam teachers, then others by name
        .OrderByDescending(t => t.IsClassTeacher)
        .ThenByDescending(t => !string.IsNullOrEmpty(t.Subject) && subjectByTeacher.ContainsKey(t.TeacherId))
        .ThenBy(t => t.TeacherName)
        .ToList();
    }

    public async Task<TeacherRatingDto> SubmitRatingAsync(Guid studentId, SubmitTeacherRatingDto dto)
    {
        if (dto.Rating < 1 || dto.Rating > 5)
            throw new ArgumentException("Rating must be between 1 and 5.");

        var student = await _studentRepo.GetByIdAsync(studentId)
            ?? throw new KeyNotFoundException("Student not found.");

        // Check if the teacher belongs to the student's school (either as primary or via TeacherSchools assignment)
        var teacher = (await _teacherRepo.GetAllAsync(q =>
            q.Where(t => t.Id == dto.TeacherId && t.IsActive &&
                         (t.SchoolId == student.SchoolId || t.TeacherSchools.Any(ts => ts.SchoolId == student.SchoolId && ts.IsActive)))))
            .FirstOrDefault();

        if (teacher == null)
            throw new KeyNotFoundException("Teacher not found or not assigned to this student's school.");

        var existing = (await _ratingRepo.GetAllAsync(q =>
            q.Where(r => r.StudentId == studentId && r.TeacherId == dto.TeacherId))).FirstOrDefault();

        TeacherRating entity;
        if (existing != null)
        {
            existing.Rating  = dto.Rating;
            existing.Comment = dto.Comment;
            await _ratingRepo.UpdateAsync(existing);
            entity = existing;
        }
        else
        {
            entity = new TeacherRating
            {
                SchoolId  = student.SchoolId,
                StudentId = studentId,
                TeacherId = dto.TeacherId,
                GradeId   = student.GradeId,
                Rating    = dto.Rating,
                Comment   = dto.Comment
            };
            await _ratingRepo.AddAsync(entity);
        }

        return new TeacherRatingDto
        {
            Id          = entity.Id,
            TeacherId   = entity.TeacherId,
            TeacherName = $"{teacher.FirstName} {teacher.LastName}",
            Rating      = entity.Rating,
            Comment     = entity.Comment,
            CreatedAt   = entity.CreatedAt,
            UpdatedDate = entity.UpdatedDate
        };
    }
}
