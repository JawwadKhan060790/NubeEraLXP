using Microsoft.EntityFrameworkCore;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Repositories;
using NubeEra.Application.Interfaces.Services;
using NubeEra.Domain.Entities;
using NubeEra.Application.Interfaces.Security;

namespace NubeEra.Application.Services;

public class ResultService : IGenericService<ResultCreateDto, ResultUpdateDto, ResultDto>
{
    private readonly IGenericRepository<Result> _repository;
    private readonly ICurrentUserService _currentUserService;
    private readonly ITenantService       _tenantService;

    public ResultService(IGenericRepository<Result> repository, ICurrentUserService currentUserService, ITenantService tenantService)
    {
        _repository = repository;
        _currentUserService = currentUserService;
        _tenantService       = tenantService;
    }

    public async Task<List<ResultDto>> GetAllAsync()
    {
        var schoolId  = _tenantService.GetEffectiveSchoolId();
        var studentId = _currentUserService.StudentId; // non-null for Student JWT

        var results = await _repository.GetAllAsync(q =>
        {
            IQueryable<Result> query = q.Include(r => r.Student).Include(r => r.Exam);

            // Tenant-scope: restrict to current school
            if (schoolId.HasValue)
                query = query.Where(r => r.SchoolId == schoolId.Value);

            // Student scope: only their own results
            if (studentId.HasValue)
                query = query.Where(r => r.StudentId == studentId.Value);

            return query;
        });

        return results.Select(r => new ResultDto
        {
            Id = r.Id,
            StudentId = r.StudentId,
            StudentName = $"{r.Student?.FirstName} {r.Student?.LastName}",
            ExamId = r.ExamId,
            ExamTitle = r.Exam?.Title ?? "",
            ObtainedMarks = r.ObtainedMarks,
            TotalMarks = r.Exam?.TotalMarks ?? 0,
            Grade = r.Grade,
            Remarks = r.Remarks,
            IsPublished = r.IsPublished,
            CreatedAt = r.CreatedAt
        }).ToList();
    }

    public async Task<ResultDto?> GetByIdAsync(Guid id)
    {
        var r = await _repository.GetByIdAsync(id, q => q.Include(r => r.Student).Include(r => r.Exam));
        if (r == null) return null;

        return new ResultDto
        {
            Id = r.Id,
            StudentId = r.StudentId,
            StudentName = $"{r.Student?.FirstName} {r.Student?.LastName}",
            ExamId = r.ExamId,
            ExamTitle = r.Exam?.Title ?? "",
            ObtainedMarks = r.ObtainedMarks,
            TotalMarks = r.Exam?.TotalMarks ?? 0,
            Grade = r.Grade,
            Remarks = r.Remarks,
            IsPublished = r.IsPublished,
            CreatedAt = r.CreatedAt
        };
    }

    public async Task<Guid> CreateAsync(ResultCreateDto dto)
    {
        var result = new Result
        {
            SchoolId = _tenantService.GetEffectiveSchoolIdOrEmpty(),
            StudentId = dto.StudentId,
            ExamId = dto.ExamId,
            ObtainedMarks = dto.ObtainedMarks,
            Grade = dto.Grade,
            Remarks = dto.Remarks,
            IsPublished = dto.IsPublished
        };

        await _repository.AddAsync(result);
        return result.Id;
    }

    public async Task UpdateAsync(Guid id, ResultUpdateDto dto)
    {
        var result = await _repository.GetByIdAsync(id)
            ?? throw new Exception("Result not found");

        result.ObtainedMarks = dto.ObtainedMarks;
        result.Grade = dto.Grade;
        result.Remarks = dto.Remarks;
        result.IsPublished = dto.IsPublished;

        await _repository.UpdateAsync(result);
    }

    public async Task DeleteAsync(Guid id)
    {
        var result = await _repository.GetByIdAsync(id)
            ?? throw new Exception("Result not found");

        await _repository.DeleteAsync(result);
    }
}
