using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using NubeEra.Application.Common.Models;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Repositories;
using NubeEra.Application.Interfaces.Security;
using NubeEra.Application.Interfaces.Services;
using NubeEra.Application.Pagination;
using NubeEra.Domain.Common;
using NubeEra.Domain.Entities;

namespace NubeEra.Application.Services;

public class SubjectService : ISubjectService
{
    private readonly IGenericRepository<Subject> _repository;
    private readonly IGenericRepository<TeacherSubject> _teacherSubjectRepository;
    private readonly IGenericRepository<StudentSubject> _studentSubjectRepository;
    private readonly IGenericRepository<Teacher> _teacherRepository;
    private readonly IGenericRepository<Student> _studentRepository;
    private readonly IGenericRepository<Module> _moduleRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly ITenantService _tenantService;
    private readonly IGradeAccessService _gradeAccessService;

    public SubjectService(
        IGenericRepository<Subject> repository,
        IGenericRepository<TeacherSubject> teacherSubjectRepository,
        IGenericRepository<StudentSubject> studentSubjectRepository,
        IGenericRepository<Teacher> teacherRepository,
        IGenericRepository<Student> studentRepository,
        IGenericRepository<Module> moduleRepository,
        ICurrentUserService currentUserService,
        ITenantService tenantService,
        IGradeAccessService gradeAccessService)
    {
        _repository = repository;
        _teacherSubjectRepository = teacherSubjectRepository;
        _studentSubjectRepository = studentSubjectRepository;
        _teacherRepository = teacherRepository;
        _studentRepository = studentRepository;
        _moduleRepository = moduleRepository;
        _currentUserService = currentUserService;
        _tenantService = tenantService;
        _gradeAccessService = gradeAccessService;
    }

    public async Task<List<SubjectDto>> GetAllAsync()
    {
        var role = _currentUserService.Role?.ToLower();
        IQueryable<Subject> query = _repository.Query()
            .Include(s => s.GradeLevel)
            .Include(s => s.CreatedByTeacher)
            .Where(s => s.IsActive);

        // Teacher scoping
        if (role == "teacher" && _currentUserService.TeacherId.HasValue)
        {
            var teacherId = _currentUserService.TeacherId.Value;
            query = query.Where(s => s.TeacherSubjects.Any(ts => !ts.IsDeleted && ts.TeacherId == teacherId));
        }
        // Student scoping
        else if (role == "student" && _currentUserService.StudentId.HasValue)
        {
            var studentId = _currentUserService.StudentId.Value;
            query = query.Where(s => s.StudentSubjects.Any(ss => !ss.IsDeleted && ss.StudentId == studentId));
        }
        // School scoping for Principal, etc.
        else
        {
            var schoolId = _tenantService.GetEffectiveSchoolId();
            if (schoolId.HasValue)
            {
                query = query.Where(s => s.Modules.Any(m => !m.IsDeleted && m.SchoolAssignments.Any(a => !a.IsDeleted && a.SchoolId == schoolId.Value)));
            }
        }

        var subjects = await query.ToListAsync();

        return subjects.Select(s => new SubjectDto
        {
            Id = s.Id,
            GradeLevelId = s.GradeLevelId,
            GradeLevelName = s.GradeLevel?.Name ?? "",
            Name = s.Name,
            Description = s.Description,
            IsActive = s.IsActive,
            CreatedByTeacherId = s.CreatedByTeacherId,
            CreatedByTeacherName = s.CreatedByTeacher != null ? $"{s.CreatedByTeacher.FirstName} {s.CreatedByTeacher.LastName}".Trim() : "System"
        }).ToList();
    }

    public async Task<SubjectDto?> GetByIdAsync(Guid id)
    {
        var s = await _repository.Query()
            .Include(x => x.GradeLevel)
            .Include(x => x.CreatedByTeacher)
            .Include(x => x.Modules)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (s == null) return null;

        var teacherSubjects = await _teacherSubjectRepository.Query()
            .Where(ts => ts.SubjectId == id)
            .Include(ts => ts.Teacher)
            .ToListAsync();

        var studentSubjects = await _studentSubjectRepository.Query()
            .Where(ss => ss.SubjectId == id)
            .Include(ss => ss.Student)
            .ToListAsync();

        var dto = new SubjectDto
        {
            Id = s.Id,
            GradeLevelId = s.GradeLevelId,
            GradeLevelName = s.GradeLevel?.Name ?? "",
            Name = s.Name,
            Description = s.Description,
            IsActive = s.IsActive,
            CreatedByTeacherId = s.CreatedByTeacherId,
            CreatedByTeacherName = s.CreatedByTeacher != null ? $"{s.CreatedByTeacher.FirstName} {s.CreatedByTeacher.LastName}".Trim() : "System",
            UnitCount = s.Modules?.Count ?? 0,
            TopicCount = s.Modules?.Sum(m => m.Lessons?.Count ?? 0) ?? 0,
            AssignedTeacherIds = teacherSubjects.Select(ts => ts.TeacherId).ToList(),
            AssignedTeacherNames = teacherSubjects.Select(ts => $"{ts.Teacher.FirstName} {ts.Teacher.LastName}".Trim()).ToList(),
            AssignedStudentIds = studentSubjects.Select(ss => ss.StudentId).ToList(),
            AssignedStudentNames = studentSubjects.Select(ss => $"{ss.Student.FirstName} {ss.Student.LastName}".Trim()).ToList()
        };

        return dto;
    }

    public async Task<Guid> CreateAsync(SubjectCreateDto dto)
    {
        // Enforce Grade accessibility checks
        await _gradeAccessService.EnsureGradeAccessibleToCurrentUserAsync(dto.GradeLevelId);

        // Check unique subject name per grade level
        var existing = await _repository.CountAsync(q => q.Where(s => s.GradeLevelId == dto.GradeLevelId && s.Name.ToLower() == dto.Name.ToLower().Trim()));
        if (existing > 0)
            throw new AppException($"A subject with name '{dto.Name}' already exists for this grade level.");

        var actingTeacherId = _currentUserService.TeacherId;

        var subject = new Subject
        {
            Id = Guid.NewGuid(),
            GradeLevelId = dto.GradeLevelId,
            Name = dto.Name.Trim(),
            Description = dto.Description?.Trim(),
            IsActive = true,
            CreatedByTeacherId = dto.CreatedByTeacherId ?? actingTeacherId,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = _currentUserService.UserId != null && Guid.TryParse(_currentUserService.UserId, out var uid) ? (Guid?)uid : null
        };

        await _repository.AddAsync(subject);
        return subject.Id;
    }

    public async Task UpdateAsync(Guid id, SubjectUpdateDto dto)
    {
        var subject = await _repository.GetByIdAsync(id)
            ?? throw new KeyNotFoundException("Subject not found.");

        await _gradeAccessService.EnsureGradeAccessibleToCurrentUserAsync(dto.GradeLevelId);

        // Check unique subject name per grade level excluding current subject
        var existing = await _repository.CountAsync(q => q.Where(s => s.Id != id && s.GradeLevelId == dto.GradeLevelId && s.Name.ToLower() == dto.Name.ToLower().Trim()));
        if (existing > 0)
            throw new AppException($"A subject with name '{dto.Name}' already exists for this grade level.");

        subject.GradeLevelId = dto.GradeLevelId;
        subject.Name = dto.Name.Trim();
        subject.Description = dto.Description?.Trim();
        subject.IsActive = dto.IsActive;
        subject.UpdatedDate = DateTime.UtcNow;
        subject.UpdatedBy = _currentUserService.UserId != null && Guid.TryParse(_currentUserService.UserId, out var uid) ? (Guid?)uid : null;

        await _repository.UpdateAsync(subject);
    }

    public async Task DeleteAsync(Guid id)
    {
        var subject = await _repository.GetByIdAsync(id)
            ?? throw new KeyNotFoundException("Subject not found.");

        var deletedByUser = _currentUserService.UserId != null && Guid.TryParse(_currentUserService.UserId, out var uid) ? (Guid?)uid : null;
        await _repository.DeleteAsync(subject, deletedByUser);
    }

    public async Task<PagedResponse<SubjectDto>> GetPagedAsync(PaginationRequest request)
    {
        request.PageNumber = Math.Max(1, request.PageNumber);
        request.PageSize = Math.Clamp(request.PageSize, 1, 200);

        var query = _repository.Query();
        var role = _currentUserService.Role?.ToLower();

        // Active filter default
        if (!request.IsActive.HasValue || request.IsActive.Value)
            query = query.Where(s => s.IsActive);
        else
            query = query.Where(s => !s.IsActive);

        // Grade filter
        if (request.GradeId.HasValue)
            query = query.Where(s => s.GradeLevelId == request.GradeId.Value);
        else if (request.Filters != null && request.Filters.TryGetValue("GradeLevelId", out var gidStr) && Guid.TryParse(gidStr, out var gid))
            query = query.Where(s => s.GradeLevelId == gid);

        // Teacher scoping
        if (role == "teacher" && _currentUserService.TeacherId.HasValue)
        {
            var teacherId = _currentUserService.TeacherId.Value;
            query = query.Where(s => s.TeacherSubjects.Any(ts => !ts.IsDeleted && ts.TeacherId == teacherId));
        }
        // Student scoping
        else if (role == "student" && _currentUserService.StudentId.HasValue)
        {
            var studentId = _currentUserService.StudentId.Value;
            query = query.Where(s => s.StudentSubjects.Any(ss => !ss.IsDeleted && ss.StudentId == studentId));
        }
        // School scoping for Principal, etc.
        else
        {
            var schoolId = _tenantService.GetEffectiveSchoolId();
            if (schoolId.HasValue)
            {
                query = query.Where(s => s.Modules.Any(m => !m.IsDeleted && m.SchoolAssignments.Any(a => !a.IsDeleted && a.SchoolId == schoolId.Value)));
            }
        }

        // Search
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim().ToLower();
            query = query.Where(s => s.Name.ToLower().Contains(term) || (s.Description != null && s.Description.ToLower().Contains(term)));
        }

        var total = await query.CountAsync();

        // Sort
        if (!string.IsNullOrWhiteSpace(request.SortBy))
        {
            var desc = request.SortDirection?.Equals("DESC", StringComparison.OrdinalIgnoreCase) ?? false;
            switch (request.SortBy.ToLower())
            {
                case "name":
                    query = desc ? query.OrderByDescending(s => s.Name) : query.OrderBy(s => s.Name);
                    break;
                case "createdat":
                    query = desc ? query.OrderByDescending(s => s.CreatedAt) : query.OrderBy(s => s.CreatedAt);
                    break;
                default:
                    query = desc ? query.OrderByDescending(s => s.CreatedAt) : query.OrderBy(s => s.CreatedAt);
                    break;
            }
        }
        else
        {
            query = query.OrderBy(s => s.Name);
        }

        var skip = (request.PageNumber - 1) * request.PageSize;
        var items = await query
            .AsNoTracking()
            .Skip(skip)
            .Take(request.PageSize)
            .Include(s => s.GradeLevel)
            .Include(s => s.CreatedByTeacher)
            .ToListAsync();

        var dtos = items.Select(s => new SubjectDto
        {
            Id = s.Id,
            GradeLevelId = s.GradeLevelId,
            GradeLevelName = s.GradeLevel?.Name ?? "",
            Name = s.Name,
            Description = s.Description,
            IsActive = s.IsActive,
            CreatedByTeacherId = s.CreatedByTeacherId,
            CreatedByTeacherName = s.CreatedByTeacher != null ? $"{s.CreatedByTeacher.FirstName} {s.CreatedByTeacher.LastName}".Trim() : "System"
        }).ToList();

        // Load summary counts for the current page
        var subjectIds = dtos.Select(d => d.Id).ToList();
        var modulesCount = await _moduleRepository.Query()
            .Where(m => subjectIds.Contains(m.SubjectId ?? Guid.Empty))
            .GroupBy(m => m.SubjectId)
            .Select(g => new { SubjectId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.SubjectId!.Value, x => x.Count);

        var lessonsCount = await _moduleRepository.Query()
            .Where(m => subjectIds.Contains(m.SubjectId ?? Guid.Empty))
            .SelectMany(m => m.Lessons)
            .GroupBy(l => l.Module.SubjectId)
            .Select(g => new { SubjectId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.SubjectId!.Value, x => x.Count);

        foreach (var dto in dtos)
        {
            dto.UnitCount = modulesCount.GetValueOrDefault(dto.Id, 0);
            dto.TopicCount = lessonsCount.GetValueOrDefault(dto.Id, 0);
        }

        var pagedReq = new PagedRequest
        {
            Page = request.PageNumber,
            PageSize = request.PageSize,
            Search = request.Search,
            SortBy = request.SortBy,
            SortDirection = request.SortDirection ?? "asc"
        };
        return PagedResponse<SubjectDto>.Create(dtos, total, pagedReq);
    }

    public async Task AssignTeachersAsync(Guid subjectId, List<Guid> teacherIds)
    {
        var subject = await _repository.GetByIdAsync(subjectId)
            ?? throw new KeyNotFoundException("Subject not found.");

        var actingUserId = _currentUserService.UserId != null && Guid.TryParse(_currentUserService.UserId, out var uid) ? (Guid?)uid : null;

        // Fetch current mappings including soft-deleted ones
        var current = await _teacherSubjectRepository.Query()
            .IgnoreQueryFilters()
            .Where(ts => ts.SubjectId == subjectId)
            .ToListAsync();

        var currentTeacherIds = current.Where(ts => !ts.IsDeleted).Select(ts => ts.TeacherId).ToHashSet();
        var targetTeacherIds = teacherIds.Distinct().ToHashSet();

        // Deletions
        var toDelete = current.Where(ts => !ts.IsDeleted && !targetTeacherIds.Contains(ts.TeacherId)).ToList();
        foreach (var ts in toDelete)
        {
            await _teacherSubjectRepository.DeleteAsync(ts, actingUserId);
        }

        // Additions / Restores
        foreach (var teacherId in targetTeacherIds)
        {
            var existingRow = current.FirstOrDefault(ts => ts.TeacherId == teacherId);
            if (existingRow == null)
            {
                var ts = new TeacherSubject
                {
                    Id = Guid.NewGuid(),
                    TeacherId = teacherId,
                    SubjectId = subjectId,
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = actingUserId
                };
                await _teacherSubjectRepository.AddAsync(ts);
            }
            else if (existingRow.IsDeleted)
            {
                existingRow.UpdatedDate = DateTime.UtcNow;
                existingRow.UpdatedBy = actingUserId;
                await _teacherSubjectRepository.RestoreAsync(existingRow);
            }
        }
    }

    public async Task AssignStudentsAsync(Guid subjectId, List<Guid> studentIds)
    {
        var subject = await _repository.GetByIdAsync(subjectId)
            ?? throw new KeyNotFoundException("Subject not found.");

        var actingUserId = _currentUserService.UserId != null && Guid.TryParse(_currentUserService.UserId, out var uid) ? (Guid?)uid : null;

        // Fetch current mappings including soft-deleted ones
        var current = await _studentSubjectRepository.Query()
            .IgnoreQueryFilters()
            .Where(ss => ss.SubjectId == subjectId)
            .ToListAsync();

        var currentStudentIds = current.Where(ss => !ss.IsDeleted).Select(ss => ss.StudentId).ToHashSet();
        var targetStudentIds = studentIds.Distinct().ToHashSet();

        // Deletions
        var toDelete = current.Where(ss => !ss.IsDeleted && !targetStudentIds.Contains(ss.StudentId)).ToList();
        foreach (var ss in toDelete)
        {
            await _studentSubjectRepository.DeleteAsync(ss, actingUserId);
        }

        // Additions / Restores
        foreach (var studentId in targetStudentIds)
        {
            var existingRow = current.FirstOrDefault(ss => ss.StudentId == studentId);
            if (existingRow == null)
            {
                var ss = new StudentSubject
                {
                    Id = Guid.NewGuid(),
                    StudentId = studentId,
                    SubjectId = subjectId,
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = actingUserId
                };
                await _studentSubjectRepository.AddAsync(ss);
            }
            else if (existingRow.IsDeleted)
            {
                existingRow.UpdatedDate = DateTime.UtcNow;
                existingRow.UpdatedBy = actingUserId;
                await _studentSubjectRepository.RestoreAsync(existingRow);
            }
        }
    }
}
