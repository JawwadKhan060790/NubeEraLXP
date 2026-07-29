using Microsoft.EntityFrameworkCore;
using NubeEra.Application.Common.Models;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Repositories;
using NubeEra.Application.Interfaces.Services;
using NubeEra.Application.Pagination;
using NubeEra.Domain.Entities;
using NubeEra.Application.Interfaces.Security;

namespace NubeEra.Application.Services;

public class QuestionService : IQuestionService
{
    private readonly IGenericRepository<Question> _repository;
    private readonly ICurrentUserService _currentUserService;
    private readonly ITenantService       _tenantService;

    public QuestionService(IGenericRepository<Question> repository, ICurrentUserService currentUserService, ITenantService tenantService)
    {
        _repository = repository;
        _currentUserService = currentUserService;
        _tenantService       = tenantService;
    }

    public async Task<List<QuestionDto>> GetAllAsync()
    {
        var questions = await _repository.GetAllAsync(q => q
            .Include(x => x.Exam)
                .ThenInclude(e => e!.Module)
                    .ThenInclude(m => m!.GradeLevel)
            .Include(x => x.Module)
                .ThenInclude(m => m!.GradeLevel));

        return questions.Select(q => new QuestionDto
        {
            Id = q.Id,
            ExamId = q.ExamId,
            ExamTitle = q.Exam?.Title,
            // Exam.GradeId is a per-school Grade; Module's contribution is now the
            // school-agnostic master GradeLevel since Module no longer has its own Grade.
            GradeId = q.Exam?.GradeId ?? q.Module?.GradeLevelId,
            GradeName = q.Exam?.Grade?.GradeName ?? q.Module?.GradeLevel?.Name,
            ModuleId = q.Exam?.ModuleId ?? q.ModuleId,
            ModuleName = q.Exam?.Module?.Name ?? q.Module?.Name,
            QuestionText = q.QuestionText,
            OptionA = q.OptionA,
            OptionB = q.OptionB,
            OptionC = q.OptionC,
            OptionD = q.OptionD,
            CorrectAnswer = q.CorrectAnswer,
            IsActive = q.IsActive
        }).ToList();
    }

    /// <summary>
    /// Server-side paginated question list.
    /// Uses projection (Select) instead of ThenInclude chains to avoid loading
    /// entire Exam → Module → Grade object graphs for every row.
    /// </summary>
    public async Task<PagedResponse<QuestionDto>> GetPagedAsync(PaginationRequest request)
    {
        var schoolId = _tenantService.GetEffectiveSchoolId();

        var query = _repository.Query().AsNoTracking();

        // School scope
        if (schoolId.HasValue)
            query = query.Where(q => q.SchoolId == schoolId.Value);

        // IsActive filter
        if (request.IsActive.HasValue)
            query = query.Where(q => q.IsActive == request.IsActive.Value);

        // Exam filter
        if (request.Filters != null && request.Filters.TryGetValue("ExamId", out var eidStr) && Guid.TryParse(eidStr, out var eid))
        {
            query = query.Where(q => q.ExamId == eid);
            if (_currentUserService.GradeId.HasValue || string.Equals(_currentUserService.Role, "Student", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(q => q.Exam != null && q.Exam.Date <= DateTime.UtcNow);
            }
        }

        // Module filter
        if (request.Filters != null && request.Filters.TryGetValue("ModuleId", out var midStr) && Guid.TryParse(midStr, out var mid))
            query = query.Where(q => q.ModuleId == mid || (q.Exam != null && q.Exam.ModuleId == mid));

        // Search: question text
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim().ToLower();
            query = query.Where(q => q.QuestionText.ToLower().Contains(term));
        }

        var total = await query.CountAsync();

        // Sorting
        if (!string.IsNullOrWhiteSpace(request.SortBy))
        {
            var desc = request.SortDirection?.Equals("DESC", StringComparison.OrdinalIgnoreCase) ?? false;
            query = request.SortBy.ToLower() switch
            {
                "questiontext" => desc ? query.OrderByDescending(q => q.QuestionText) : query.OrderBy(q => q.QuestionText),
                "createdat" => desc ? query.OrderByDescending(q => q.CreatedAt) : query.OrderBy(q => q.CreatedAt),
                _ => query.OrderByDescending(q => q.CreatedAt)
            };
        }
        else
        {
            query = query.OrderByDescending(q => q.CreatedAt);
        }

        var skip = (request.PageNumber - 1) * request.PageSize;

        // Projection — avoids deep ThenInclude chains: Exam→Module→Grade loaded
        // via sub-navigation selects which EF translates to efficient JOIN queries
        var items = await query
            .Skip(skip)
            .Take(request.PageSize)
            .Select(q => new QuestionDto
            {
                Id = q.Id,
                ExamId = q.ExamId,
                ExamTitle = q.Exam != null ? q.Exam.Title : null,
                GradeId = q.Exam != null ? q.Exam.GradeId : q.Module != null ? q.Module.GradeLevelId : null,
                GradeName = q.Exam != null && q.Exam.Grade != null ? q.Exam.Grade.GradeName
                          : q.Module != null && q.Module.GradeLevel != null ? q.Module.GradeLevel.Name : null,
                ModuleId = q.Exam != null ? q.Exam.ModuleId : q.ModuleId,
                ModuleName = q.Exam != null && q.Exam.Module != null ? q.Exam.Module.Name
                           : q.Module != null ? q.Module.Name : null,
                QuestionText = q.QuestionText,
                OptionA = q.OptionA,
                OptionB = q.OptionB,
                OptionC = q.OptionC,
                OptionD = q.OptionD,
                CorrectAnswer = q.CorrectAnswer,
                IsActive = q.IsActive
            })
            .ToListAsync();

        var pagedReq = new PagedRequest
        {
            Page = request.PageNumber,
            PageSize = request.PageSize,
            Search = request.Search,
            SortBy = request.SortBy,
            SortDirection = request.SortDirection ?? "asc"
        };
        return PagedResponse<QuestionDto>.Create(items, total, pagedReq);
    }

    public async Task<QuestionDto?> GetByIdAsync(Guid id)
    {
        var q = await _repository.GetByIdAsync(id, query => query
            .Include(x => x.Exam)
                .ThenInclude(e => e!.Module)
                    .ThenInclude(m => m!.GradeLevel)
            .Include(x => x.Module)
                .ThenInclude(m => m!.GradeLevel));
        if (q == null) return null;

        return new QuestionDto
        {
            Id = q.Id,
            ExamId = q.ExamId,
            ExamTitle = q.Exam?.Title,
            GradeId = q.Exam?.GradeId ?? q.Module?.GradeLevelId,
            GradeName = q.Exam?.Grade?.GradeName ?? q.Module?.GradeLevel?.Name,
            ModuleId = q.Exam?.ModuleId ?? q.ModuleId,
            ModuleName = q.Exam?.Module?.Name ?? q.Module?.Name,
            QuestionText = q.QuestionText,
            OptionA = q.OptionA,
            OptionB = q.OptionB,
            OptionC = q.OptionC,
            OptionD = q.OptionD,
            CorrectAnswer = q.CorrectAnswer,
            IsActive = q.IsActive
        };
    }

    public async Task<Guid> CreateAsync(QuestionCreateDto dto)
    {
        var question = new Question
        {
            SchoolId = _tenantService.GetEffectiveSchoolId(),
            ExamId = dto.ExamId,
            ModuleId = dto.ModuleId,
            QuestionText = dto.QuestionText,
            OptionA = dto.OptionA,
            OptionB = dto.OptionB,
            OptionC = dto.OptionC,
            OptionD = dto.OptionD,
            CorrectAnswer = dto.CorrectAnswer.ToUpper(),
            IsActive = true
        };

        await _repository.AddAsync(question);
        return question.Id;
    }

    public async Task UpdateAsync(Guid id, QuestionUpdateDto dto)
    {
        var question = await _repository.GetByIdAsync(id)
            ?? throw new Exception("Question not found");

        question.ExamId = dto.ExamId;
        question.ModuleId = dto.ModuleId;
        question.QuestionText = dto.QuestionText;
        question.OptionA = dto.OptionA;
        question.OptionB = dto.OptionB;
        question.OptionC = dto.OptionC;
        question.OptionD = dto.OptionD;
        question.CorrectAnswer = dto.CorrectAnswer.ToUpper();
        question.IsActive = dto.IsActive;

        await _repository.UpdateAsync(question);
    }

    public async Task DeleteAsync(Guid id)
    {
        var question = await _repository.GetByIdAsync(id)
            ?? throw new Exception("Question not found");

        await _repository.DeleteAsync(question);
    }
}
