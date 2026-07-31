using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using Veriton.Application.Common.Models;
using Veriton.Application.DTOs;
using Veriton.Application.Interfaces.Repositories;
using Veriton.Application.Interfaces.Services;
using Veriton.Application.Pagination;
using Veriton.Domain.Entities;
using Veriton.Application.Interfaces.Security;

namespace Veriton.Application.Services;

public class LessonService : ILessonService
{
    private readonly IGenericRepository<Lesson> _repository;
    private readonly IGenericRepository<LessonCompletion> _completionRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly ITenantService       _tenantService;
    private readonly IGenericRepository<SchoolUnitAssignment> _unitAssignmentRepository;
    private readonly IGenericRepository<Grade> _gradeRepository;

    public LessonService(
        IGenericRepository<Lesson> repository, 
        IGenericRepository<LessonCompletion> completionRepository,
        ICurrentUserService currentUserService, 
        ITenantService tenantService,
        IGenericRepository<SchoolUnitAssignment> unitAssignmentRepository,
        IGenericRepository<Grade> gradeRepository)
    {
        _repository = repository;
        _completionRepository = completionRepository;
        _currentUserService = currentUserService;
        _tenantService       = tenantService;
        _unitAssignmentRepository = unitAssignmentRepository;
        _gradeRepository = gradeRepository;
    }

    /// <summary>
    /// Deserializes a lesson's VideoUrls JSON → List, falling back to the legacy VideoUrl string.
    /// </summary>
    private static List<string> ParseVideoUrls(string? videoUrlsJson, string? legacyVideoUrl)
    {
        if (!string.IsNullOrWhiteSpace(videoUrlsJson))
        {
            try { return JsonSerializer.Deserialize<List<string>>(videoUrlsJson) ?? new(); }
            catch { /* malformed JSON — fall through */ }
        }
        if (!string.IsNullOrWhiteSpace(legacyVideoUrl))
            return new List<string> { legacyVideoUrl };
        return new List<string>();
    }

    private static string? SerializeVideoUrls(List<string>? urls)
        => (urls == null || urls.Count == 0) ? null : JsonSerializer.Serialize(urls);

    public async Task<List<LessonDto>> GetAllAsync()
    {
        // Topics are master content inherited from their parent Unit's grade level.
        // For students, restrict to only Topics whose parent Module is assigned to
        // their school via SchoolUnitAssignment.
        var query = _repository.Query()
            .Include(l => l.Module).Include(l => l.CreatedByTeacher)
            .AsQueryable();

        // ── Student curriculum scoping ───────────────────────────────────────
        var role = _currentUserService.Role?.ToLower();
        if (role == "student")
        {
            var schoolId = _currentUserService.SchoolId;
            if (schoolId.HasValue)
            {
                var assignedUnitIds = await _unitAssignmentRepository
                    .Query()
                    .Where(a => a.SchoolId == schoolId.Value)
                    .Select(a => a.UnitId)
                    .ToListAsync();

                query = query.Where(l => assignedUnitIds.Contains(l.ModuleId));
            }
        }

        var lessons = await query.ToListAsync();

        return lessons.Select(l => new LessonDto
        {
            Id = l.Id,
            ModuleId = l.ModuleId,
            ModuleName = l.Module?.Name ?? "",
            SubTopic = l.SubTopic,
            Activity = l.Activity,
            VideoUrl = l.VideoUrl,
            VideoUrls = ParseVideoUrls(l.VideoUrls, l.VideoUrl),
            DiagramUrl = l.DiagramUrl,
            Source = l.Source,
            Code = l.Code,
            Procedure = l.Procedure,
            RequiredMaterial = l.RequiredMaterial,
            WhatYouGet = l.WhatYouGet,
            PdfFileUrl = l.PdfFileUrl,
            CreatedByTeacherId = l.CreatedByTeacherId,
            CreatedByTeacherName = l.CreatedByTeacher != null
                ? $"{l.CreatedByTeacher.FirstName} {l.CreatedByTeacher.LastName}" : "",
            SerialNumber = l.SerialNumber,
            TotalHours = l.TotalHours,
            ExpectedPeriods = l.ExpectedPeriods,
            DisplayOrder = l.DisplayOrder,
            IsActive = l.IsActive,
            IsActivity = l.IsActivity,
            IsRoboticsActivity = l.IsRoboticsActivity,
            IsPythonActivity = l.IsPythonActivity,
            IsAiToolActivity = l.IsAiToolActivity,
            BrowserUrl = l.BrowserUrl,
            CreatedAt = l.CreatedAt
        }).ToList();
    }

    /// <summary>
    /// Server-side paginated lesson list.
    /// Longtext columns (Activity, DiagramUrl, Code, Procedure, RequiredMaterial, WhatYouGet)
    /// are intentionally excluded from the projection — they are only loaded by GetByIdAsync
    /// to avoid transferring megabytes of data for every row in the list view.
    /// </summary>
    public async Task<PagedResponse<LessonDto>> GetPagedAsync(PaginationRequest request)
    {
        var query = _repository.Query()
            .Where(l => l.Module != null)
            .AsNoTracking();

        // IsActive filter
        if (request.IsActive.HasValue)
            query = query.Where(l => l.IsActive == request.IsActive.Value);
        else
            query = query.Where(l => l.IsActive); // default: active only

        // Unit / Module filter
        Guid? filterUnitId = request.UnitId ?? request.ModuleId;
        if (!filterUnitId.HasValue && request.Filters != null)
        {
            if (request.Filters.TryGetValue("UnitId", out var uidStr) && Guid.TryParse(uidStr, out var uid))
                filterUnitId = uid;
            else if (request.Filters.TryGetValue("ModuleId", out var midStr) && Guid.TryParse(midStr, out var mid))
                filterUnitId = mid;
        }
        if (filterUnitId.HasValue && filterUnitId.Value != Guid.Empty)
        {
            query = query.Where(l => l.ModuleId == filterUnitId.Value);
        }

        // Grade level filter — join through Module (resolves GradeLevelId from Grade entity if a per-school Grade ID is passed)
        if (request.GradeId.HasValue && request.GradeId.Value != Guid.Empty)
        {
            var gId = request.GradeId.Value;
            var perSchoolGrade = await _gradeRepository.GetByIdAsync(gId);
            var targetGradeLevelId = perSchoolGrade != null ? perSchoolGrade.GradeLevelId : gId;

            query = query.Where(l => l.Module != null && l.Module.GradeLevelId == targetGradeLevelId);
        }

        // School filter — join through SchoolUnitAssignment
        Guid? filterSchoolId = request.SchoolId;
        if (!filterSchoolId.HasValue && request.Filters != null && request.Filters.TryGetValue("SchoolId", out var sidStr) && Guid.TryParse(sidStr, out var sid))
            filterSchoolId = sid;

        if (filterSchoolId.HasValue && filterSchoolId.Value != Guid.Empty)
        {
            var assignedUnitIds = await _unitAssignmentRepository
                .Query()
                .Where(a => a.SchoolId == filterSchoolId.Value)
                .Select(a => a.UnitId)
                .ToListAsync();

            query = query.Where(l => assignedUnitIds.Contains(l.ModuleId));
        }

        // Search: SubTopic or Module name
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim().ToLower();
            query = query.Where(l =>
                (l.SubTopic != null && l.SubTopic.ToLower().Contains(term)) ||
                (l.Module != null && l.Module.Name.ToLower().Contains(term)));
        }

        var total = await query.CountAsync();

        // Sorting
        if (!string.IsNullOrWhiteSpace(request.SortBy))
        {
            var desc = request.SortDirection?.Equals("DESC", StringComparison.OrdinalIgnoreCase) ?? false;
            query = request.SortBy.ToLower() switch
            {
                "subtopic" => desc ? query.OrderByDescending(l => l.SubTopic) : query.OrderBy(l => l.SubTopic),
                "serialnumber" => desc ? query.OrderByDescending(l => l.SerialNumber) : query.OrderBy(l => l.SerialNumber),
                "displayorder" => desc
                    ? query.OrderByDescending(l => l.DisplayOrder).ThenByDescending(l => l.SerialNumber)
                    : query.OrderBy(l => l.DisplayOrder).ThenBy(l => l.SerialNumber).ThenBy(l => l.CreatedAt),
                "totalhours" => desc ? query.OrderByDescending(l => l.TotalHours) : query.OrderBy(l => l.TotalHours),
                "createdat" => desc ? query.OrderByDescending(l => l.CreatedAt) : query.OrderBy(l => l.CreatedAt),
                _ => query.OrderBy(l => l.DisplayOrder).ThenBy(l => l.SerialNumber).ThenBy(l => l.CreatedAt)
            };
        }
        else
        {
            query = query.OrderBy(l => l.DisplayOrder).ThenBy(l => l.SerialNumber).ThenBy(l => l.CreatedAt);
        }

        var skip = (request.PageNumber - 1) * request.PageSize;

        // Projection — deliberately omits longtext columns: Activity, DiagramUrl, Code,
        // Procedure, RequiredMaterial, WhatYouGet. GetByIdAsync loads those on demand.
        var items = await query
            .Skip(skip)
            .Take(request.PageSize)
            .Select(l => new LessonDto
            {
                Id = l.Id,
                ModuleId = l.ModuleId,
                ModuleName = l.Module != null ? l.Module.Name : "",
                SubTopic = l.SubTopic,
                VideoUrl = l.VideoUrl,
                VideoUrls = ParseVideoUrls(l.VideoUrls, l.VideoUrl),
                PdfFileUrl = l.PdfFileUrl,
                CreatedByTeacherId = l.CreatedByTeacherId,
                CreatedByTeacherName = l.CreatedByTeacher != null
                    ? l.CreatedByTeacher.FirstName + " " + l.CreatedByTeacher.LastName : "",
                SerialNumber = l.SerialNumber,
                TotalHours = l.TotalHours,
                ExpectedPeriods = l.ExpectedPeriods,
                DisplayOrder = l.DisplayOrder,
                IsActive = l.IsActive,
                IsActivity = l.IsActivity,
                IsRoboticsActivity = l.IsRoboticsActivity,
                IsPythonActivity = l.IsPythonActivity,
                IsAiToolActivity = l.IsAiToolActivity,
                BrowserUrl = l.BrowserUrl,
                CreatedAt = l.CreatedAt
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
        return PagedResponse<LessonDto>.Create(items, total, pagedReq);
    }

    public async Task<LessonDto?> GetByIdAsync(Guid id)
    {
        var l = await _repository.GetByIdAsync(id, q => q
            .Include(l => l.Module)
            .Include(l => l.CreatedByTeacher));
        if (l == null) return null;

        return new LessonDto
        {
            Id = l.Id,
            ModuleId = l.ModuleId,
            ModuleName = l.Module?.Name ?? "",
            SubTopic = l.SubTopic,
            Activity = l.Activity,
            VideoUrl = l.VideoUrl,
            VideoUrls = ParseVideoUrls(l.VideoUrls, l.VideoUrl),
            DiagramUrl = l.DiagramUrl,
            Source = l.Source,
            Code = l.Code,
            Procedure = l.Procedure,
            RequiredMaterial = l.RequiredMaterial,
            WhatYouGet = l.WhatYouGet,
            PdfFileUrl = l.PdfFileUrl,
            SerialNumber = l.SerialNumber,
            TotalHours = l.TotalHours,
            ExpectedPeriods = l.ExpectedPeriods,
            DisplayOrder = l.DisplayOrder,
            CreatedByTeacherId = l.CreatedByTeacherId,
            CreatedByTeacherName = l.CreatedByTeacher != null
                ? $"{l.CreatedByTeacher.FirstName} {l.CreatedByTeacher.LastName}" : "",
            IsActive = l.IsActive,
            IsActivity = l.IsActivity,
            IsRoboticsActivity = l.IsRoboticsActivity,
            IsPythonActivity = l.IsPythonActivity,
            IsAiToolActivity = l.IsAiToolActivity,
            BrowserUrl = l.BrowserUrl,
            CreatedAt = l.CreatedAt
        };
    }

    public async Task<Guid> CreateAsync(LessonCreateDto dto)
    {
        // Resolve teacher ID - use DTO value if provided, otherwise use current user's TeacherId
        var teacherId = dto.CreatedByTeacherId
            ?? _currentUserService.TeacherId;

        var lesson = new Lesson
        {
            ModuleId = dto.ModuleId,
            SubTopic = dto.SubTopic,
            Activity = dto.Activity,
            VideoUrl = dto.VideoUrl,
            VideoUrls = SerializeVideoUrls(dto.VideoUrls),
            DiagramUrl = dto.DiagramUrl,
            Source = dto.Source,
            Code = dto.Code,
            Procedure = dto.Procedure,
            RequiredMaterial = dto.RequiredMaterial,
            WhatYouGet = dto.WhatYouGet,
            PdfFileUrl = dto.PdfFileUrl,
            SerialNumber = dto.SerialNumber,
            TotalHours = dto.TotalHours,
            ExpectedPeriods = dto.ExpectedPeriods,
            DisplayOrder = dto.DisplayOrder,
            CreatedByTeacherId = teacherId,
            IsActive = true,
            IsActivity = dto.IsActivity,
            IsRoboticsActivity = dto.IsRoboticsActivity,
            IsPythonActivity = dto.IsPythonActivity,
            IsAiToolActivity = dto.IsAiToolActivity,
            BrowserUrl = dto.BrowserUrl
        };

        await _repository.AddAsync(lesson);
        return lesson.Id;
    }

    public async Task UpdateAsync(Guid id, LessonUpdateDto dto)
    {
        var lesson = await _repository.GetByIdAsync(id)
            ?? throw new Exception("Lesson not found");

        lesson.ModuleId = dto.ModuleId;
        lesson.SubTopic = dto.SubTopic;
        lesson.Activity = dto.Activity;
        lesson.VideoUrl = dto.VideoUrl;
        lesson.VideoUrls = SerializeVideoUrls(dto.VideoUrls);
        lesson.DiagramUrl = dto.DiagramUrl;
        lesson.Source = dto.Source;
        lesson.Code = dto.Code;
        lesson.Procedure = dto.Procedure;
        lesson.RequiredMaterial = dto.RequiredMaterial;
        lesson.WhatYouGet = dto.WhatYouGet;
        lesson.PdfFileUrl = dto.PdfFileUrl;
        lesson.SerialNumber = dto.SerialNumber;
        lesson.TotalHours = dto.TotalHours;
        lesson.ExpectedPeriods = dto.ExpectedPeriods;
        lesson.DisplayOrder = dto.DisplayOrder;
        // Only update TeacherId if explicitly provided in the DTO
        if (dto.CreatedByTeacherId.HasValue)
            lesson.CreatedByTeacherId = dto.CreatedByTeacherId;
        lesson.IsActive = dto.IsActive;
        lesson.IsActivity = dto.IsActivity;
        lesson.IsRoboticsActivity = dto.IsRoboticsActivity;
        lesson.IsPythonActivity = dto.IsPythonActivity;
        lesson.IsAiToolActivity = dto.IsAiToolActivity;
        lesson.BrowserUrl = dto.BrowserUrl;

        await _repository.UpdateAsync(lesson);
    }

    public async Task DeleteAsync(Guid id)
    {
        var lesson = await _repository.GetByIdAsync(id)
            ?? throw new Exception("Lesson not found");

        await _repository.DeleteAsync(lesson);
    }

    public async Task MarkAsCompletedAsync(Guid lessonId)
    {
        var studentId = _currentUserService.StudentId ?? Guid.Empty;
        if (studentId == Guid.Empty) throw new Exception("Only students can mark lessons as complete");

        var existing = await _completionRepository.GetAllAsync(q => 
            q.Where(c => c.LessonId == lessonId && c.StudentId == studentId));

        if (existing.Any()) return;

        var completion = new LessonCompletion
        {
            SchoolId = _tenantService.GetEffectiveSchoolIdOrEmpty(),
            StudentId = studentId,
            LessonId = lessonId,
            CompletionDate = DateTime.UtcNow
        };

        await _completionRepository.AddAsync(completion);
    }

    public async Task MarkAsIncompleteAsync(Guid lessonId)
    {
        var studentId = _currentUserService.StudentId ?? Guid.Empty;
        if (studentId == Guid.Empty) throw new Exception("Only students can manage lesson completions");

        var existingCompletions = await _completionRepository.GetAllAsync(q => 
            q.Where(c => c.LessonId == lessonId && c.StudentId == studentId));

        foreach (var completion in existingCompletions)
        {
            await _completionRepository.DeleteAsync(completion);
        }
    }

    public async Task<List<Guid>> GetCompletedLessonIdsAsync()
    {
        var studentId = _currentUserService.StudentId ?? Guid.Empty;
        if (studentId == Guid.Empty) return new List<Guid>();

        var completions = await _completionRepository.GetAllAsync(q => 
            q.Where(c => c.StudentId == studentId));

        return completions.Select(c => c.LessonId).ToList();
    }
}
