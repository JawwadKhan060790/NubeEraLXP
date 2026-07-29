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

namespace NubeEra.Application.Services;

public class StudentPythonCodeService : IStudentPythonCodeService
{
    private readonly IGenericRepository<StudentPythonCode> _repository;
    private readonly IGenericRepository<Lesson> _lessonRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly ITenantService       _tenantService;

    public StudentPythonCodeService(
        IGenericRepository<StudentPythonCode> repository,
        IGenericRepository<Lesson> lessonRepository,
        ICurrentUserService currentUserService,
       
        ITenantService tenantService)
    {
        _repository = repository;
        _lessonRepository = lessonRepository;
        _currentUserService = currentUserService;
        _tenantService       = tenantService;
    }

    public async Task<StudentPythonCodeDto?> GetCodeAsync(Guid lessonId)
    {
        var studentId = _currentUserService.StudentId ?? Guid.Empty;
        if (studentId == Guid.Empty) return null;

        var results = await _repository.GetAllAsync(q =>
            q.Where(c => c.LessonId == lessonId && c.StudentId == studentId));

        var code = results.FirstOrDefault();
        if (code == null) return null;

        return new StudentPythonCodeDto
        {
            LessonId = code.LessonId,
            CourseId = code.CourseId,
            StudentId = code.StudentId,
            PythonCode = code.PythonCode,
            LastModifiedDate = code.LastModifiedDate
        };
    }

    public async Task SaveCodeAsync(StudentPythonCodeSaveDto dto)
    {
        var studentId = _currentUserService.StudentId ?? Guid.Empty;
        var schoolId = _tenantService.GetEffectiveSchoolIdOrEmpty();

        if (studentId == Guid.Empty) throw new Exception("Only students can save Python code");

        // Verify lesson exists
        var lesson = await _lessonRepository.GetByIdAsync(dto.LessonId);
        if (lesson == null)
        {
            throw new Exception($"Lesson with ID {dto.LessonId} not found.");
        }

        var existing = await _repository.GetAllAsync(q =>
            q.Where(c => c.LessonId == dto.LessonId && c.StudentId == studentId));

        var code = existing.FirstOrDefault();

        if (code == null)
        {
            code = new StudentPythonCode
            {
                SchoolId = schoolId,
                StudentId = studentId,
                LessonId = dto.LessonId,
                CourseId = dto.CourseId,
                PythonCode = dto.PythonCode,
                LastModifiedDate = DateTime.UtcNow
            };
            await _repository.AddAsync(code);
        }
        else
        {
            code.PythonCode = dto.PythonCode;
            code.LastModifiedDate = DateTime.UtcNow;
            await _repository.UpdateAsync(code);
        }
    }

    public async Task<StudentPythonCodeDto?> GetStudentCodeForTeacherAsync(Guid studentId, Guid lessonId)
    {
        var results = await _repository.GetAllAsync(q =>
            q.Where(c => c.LessonId == lessonId && c.StudentId == studentId));

        var code = results.FirstOrDefault();
        if (code == null) return null;

        return new StudentPythonCodeDto
        {
            LessonId = code.LessonId,
            CourseId = code.CourseId,
            StudentId = code.StudentId,
            PythonCode = code.PythonCode,
            LastModifiedDate = code.LastModifiedDate
        };
    }

    public async Task<IEnumerable<StudentPythonCodeDto>> GetSubmissionsForLessonAsync(Guid lessonId)
    {
        var submissions = await _repository.GetAllAsync(q =>
            q.Where(c => c.LessonId == lessonId));

        return submissions.Select(c => new StudentPythonCodeDto
        {
            LessonId = c.LessonId,
            CourseId = c.CourseId,
            StudentId = c.StudentId,
            PythonCode = c.PythonCode,
            LastModifiedDate = c.LastModifiedDate
        }).ToList();
    }
}
