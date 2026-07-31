using Microsoft.EntityFrameworkCore;
using Veriton.Application.DTOs;
using Veriton.Application.Interfaces.Repositories;
using Veriton.Application.Interfaces.Services;
using Veriton.Application.Interfaces.Security;
using Veriton.Domain.Entities;

namespace Veriton.Application.Services;

public class StudentNoteService : IStudentNoteService
{
    private readonly IGenericRepository<StudentNote> _repository;
    private readonly IGenericRepository<Lesson> _lessonRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly ITenantService       _tenantService;

    public StudentNoteService(
        IGenericRepository<StudentNote> repository, 
        IGenericRepository<Lesson> lessonRepository,
        ICurrentUserService currentUserService, 
        ITenantService tenantService)
    {
        _repository = repository;
        _lessonRepository = lessonRepository;
        _currentUserService = currentUserService;
        _tenantService       = tenantService;
    }

    public async Task<StudentNoteDto?> GetNoteAsync(Guid lessonId)
    {
        var studentId = _currentUserService.StudentId ?? Guid.Empty;
        if (studentId == Guid.Empty) return null;

        var note = await _repository.GetAllAsync(q => 
            q.Where(n => n.LessonId == lessonId && n.StudentId == studentId));
        
        var n = note.FirstOrDefault();
        if (n == null) return null;

        return new StudentNoteDto
        {
            LessonId = n.LessonId,
            Content = n.Content,
            LastUpdated = n.LastUpdated
        };
    }

    public async Task SaveNoteAsync(StudentNoteSaveDto dto)
    {
        var studentId = _currentUserService.StudentId ?? Guid.Empty;
        var schoolId = _tenantService.GetEffectiveSchoolIdOrEmpty();
        
        if (studentId == Guid.Empty) throw new Exception("Only students can save personal notes");

        // Verify lesson exists using the lesson repository
        var lesson = await _lessonRepository.GetByIdAsync(dto.LessonId);
        if (lesson == null)
        {
            throw new Exception($"Lesson with ID {dto.LessonId} not found in the database.");
        }

        var existing = await _repository.GetAllAsync(q => 
            q.Where(n => n.LessonId == dto.LessonId && n.StudentId == studentId));
        
        var note = existing.FirstOrDefault();

        if (note == null)
        {
            note = new StudentNote
            {
                SchoolId = schoolId,
                StudentId = studentId,
                LessonId = dto.LessonId,
                Content = dto.Content,
                LastUpdated = DateTime.UtcNow
            };
            await _repository.AddAsync(note);
        }
        else
        {
            note.Content = dto.Content;
            note.LastUpdated = DateTime.UtcNow;
            await _repository.UpdateAsync(note);
        }
    }
}
