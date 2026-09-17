using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using NubeEra.Application.Common.Models;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Repositories;
using NubeEra.Application.Interfaces.Security;
using NubeEra.Application.Interfaces.Services;
using NubeEra.Domain.Common;
using NubeEra.Domain.Entities;

namespace NubeEra.Application.Services;

/// <summary>
/// See <see cref="ISchoolCurriculumAssignmentService"/> for the full business-rule
/// summary (restore-on-reassign, Unit→Topic dependency, cascade-unassign, audit logging).
/// </summary>
public class SchoolCurriculumAssignmentService : ISchoolCurriculumAssignmentService
{
    private readonly IGenericRepository<SchoolUnitAssignment>       _unitAssignmentRepo;
    private readonly IGenericRepository<SchoolTopicAssignment>      _topicAssignmentRepo;
    private readonly IGenericRepository<Module>                     _moduleRepo;
    private readonly IGenericRepository<Lesson>                     _lessonRepo;
    private readonly IGenericRepository<School>                     _schoolRepo;
    private readonly IGenericRepository<TeacherSchool>              _teacherSchoolRepo;
    private readonly IGenericRepository<Student>                    _studentRepo;
    private readonly IGenericRepository<User>                       _userRepo;
    private readonly IPagedRepository<CurriculumAssignmentAuditLog> _auditLogPagedRepo;
    private readonly IGenericRepository<CurriculumAssignmentAuditLog> _auditLogRepo;
    private readonly ICurrentUserService                            _currentUserService;
    private readonly IGradeAccessService                            _gradeAccessService;

    public SchoolCurriculumAssignmentService(
        IGenericRepository<SchoolUnitAssignment>         unitAssignmentRepo,
        IGenericRepository<SchoolTopicAssignment>        topicAssignmentRepo,
        IGenericRepository<Module>                       moduleRepo,
        IGenericRepository<Lesson>                       lessonRepo,
        IGenericRepository<School>                       schoolRepo,
        IGenericRepository<TeacherSchool>                teacherSchoolRepo,
        IGenericRepository<Student>                       studentRepo,
        IGenericRepository<User>                          userRepo,
        IPagedRepository<CurriculumAssignmentAuditLog>    auditLogPagedRepo,
        IGenericRepository<CurriculumAssignmentAuditLog>  auditLogRepo,
        ICurrentUserService                                currentUserService,
        IGradeAccessService                                gradeAccessService)
    {
        _unitAssignmentRepo  = unitAssignmentRepo;
        _topicAssignmentRepo = topicAssignmentRepo;
        _moduleRepo          = moduleRepo;
        _lessonRepo          = lessonRepo;
        _schoolRepo          = schoolRepo;
        _teacherSchoolRepo   = teacherSchoolRepo;
        _studentRepo         = studentRepo;
        _userRepo            = userRepo;
        _auditLogPagedRepo   = auditLogPagedRepo;
        _auditLogRepo        = auditLogRepo;
        _currentUserService  = currentUserService;
        _gradeAccessService  = gradeAccessService;
    }

    // ── Catalog / views ──────────────────────────────────────────────────────

    public async Task<PagedResponse<SchoolCurriculumCatalogItemDto>> GetCatalogAsync(SchoolCurriculumCatalogQueryDto query)
    {
        var assignedUnits = new Dictionary<Guid, DateTime>();
        var assignedTopics = new Dictionary<Guid, DateTime>();

        if (query.SchoolId != Guid.Empty)
        {
            _ = await _schoolRepo.GetByIdAsync(query.SchoolId)
                ?? throw new KeyNotFoundException("School not found.");

            assignedUnits = (await _unitAssignmentRepo.GetAllAsync(q => q.Where(a => a.SchoolId == query.SchoolId)))
                .ToDictionary(a => a.UnitId, a => a.AssignedDate);
            assignedTopics = (await _topicAssignmentRepo.GetAllAsync(q => q.Where(a => a.SchoolId == query.SchoolId)))
                .ToDictionary(a => a.TopicId, a => a.AssignedDate);
        }

        var items = new List<SchoolCurriculumCatalogItemDto>();
        var wantUnits  = query.EntityType is null || query.EntityType.Equals("Unit", StringComparison.OrdinalIgnoreCase);
        var wantTopics = query.EntityType is null || query.EntityType.Equals("Topic", StringComparison.OrdinalIgnoreCase);

        if (wantUnits)
        {
            var units = await _moduleRepo.GetAllAsync(q => q
                .IgnoreQueryFilters()
                .Where(u => !u.IsDeleted)
                .Include(u => u.GradeLevel)
                .Include(u => u.Subject));
            items.AddRange(units.Select(u => new SchoolCurriculumCatalogItemDto
            {
                Id                 = u.Id,
                EntityType         = "Unit",
                Name               = u.Name,
                Code               = null,
                ParentUnitId       = null,
                ParentUnitName     = null,
                GradeLevelId       = u.GradeLevelId,
                GradeLevelName     = u.GradeLevel?.Name,
                SubjectId          = u.SubjectId,
                SubjectName        = u.Subject?.Name,
                IsActive           = u.IsActive,
                IsAssignedToSchool = assignedUnits.ContainsKey(u.Id),
                AssignedDate       = assignedUnits.TryGetValue(u.Id, out var ud) ? ud : null
            }));
        }

        if (wantTopics)
        {
            var topics = await _lessonRepo.GetAllAsync(q => q
                .IgnoreQueryFilters()
                .Where(t => !t.IsDeleted)
                .Include(t => t.Module).ThenInclude(m => m.GradeLevel)
                .Include(t => t.Module).ThenInclude(m => m.Subject));
            if (query.UnitId.HasValue)
                topics = topics.Where(t => t.ModuleId == query.UnitId.Value).ToList();

            items.AddRange(topics.Select(t => new SchoolCurriculumCatalogItemDto
            {
                Id                 = t.Id,
                EntityType         = "Topic",
                Name               = t.SubTopic,
                Code               = null,
                ParentUnitId       = t.ModuleId,
                ParentUnitName     = t.Module?.Name,
                GradeLevelId       = t.Module?.GradeLevelId,
                GradeLevelName     = t.Module?.GradeLevel?.Name,
                SubjectId          = t.Module?.SubjectId,
                SubjectName        = t.Module?.Subject?.Name,
                IsActive           = t.IsActive,
                IsAssignedToSchool = assignedTopics.ContainsKey(t.Id),
                AssignedDate       = assignedTopics.TryGetValue(t.Id, out var td) ? td : null
            }));
        }

        if (query.AssignedOnly.HasValue)
            items = items.Where(i => i.IsAssignedToSchool == query.AssignedOnly.Value).ToList();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim();
            items = items.Where(i =>
                    i.Name.Contains(term, StringComparison.OrdinalIgnoreCase) ||
                    (i.Code != null && i.Code.Contains(term, StringComparison.OrdinalIgnoreCase)))
                .ToList();
        }

        items = items
            .OrderBy(i => i.GradeLevelName)
            .ThenBy(i => i.SubjectName)
            .ThenByDescending(i => i.EntityType) // "Unit" before "Topic"
            .ThenBy(i => i.Name)
            .ToList();

        var totalCount = items.Count;
        var paged = items.Skip(query.Skip).Take(query.PageSize).ToList();

        return PagedResponse<SchoolCurriculumCatalogItemDto>.Create(paged, totalCount, query);
    }

    public async Task<List<SchoolUnitAssignmentDto>> GetSchoolUnitAssignmentsAsync(Guid schoolId)
    {
        var assignments = await _unitAssignmentRepo.GetAllAsync(q =>
            q.Where(a => a.SchoolId == schoolId)
             .Include(a => a.School)
             .Include(a => a.Unit)
             .OrderByDescending(a => a.AssignedDate));

        var names = await ResolveUserNamesAsync(assignments.Select(a => a.AssignedBy));

        return assignments.Select(a => new SchoolUnitAssignmentDto
        {
            Id             = a.Id,
            SchoolId       = a.SchoolId,
            SchoolName     = a.School?.Name ?? "",
            UnitId         = a.UnitId,
            UnitName       = a.Unit?.Name ?? "",
            UnitCode       = null,
            AssignedBy     = a.AssignedBy,
            AssignedByName = names.GetValueOrDefault(a.AssignedBy),
            AssignedDate   = a.AssignedDate,
            Notes          = a.Notes
        }).ToList();
    }

    public async Task<List<SchoolTopicAssignmentDto>> GetSchoolTopicAssignmentsAsync(Guid schoolId)
    {
        var assignments = await _topicAssignmentRepo.GetAllAsync(q =>
            q.Where(a => a.SchoolId == schoolId)
             .Include(a => a.School)
             .Include(a => a.Topic).ThenInclude(t => t.Module)
             .OrderByDescending(a => a.AssignedDate));

        var names = await ResolveUserNamesAsync(assignments.Select(a => a.AssignedBy));

        return assignments.Select(a => new SchoolTopicAssignmentDto
        {
            Id             = a.Id,
            SchoolId       = a.SchoolId,
            SchoolName     = a.School?.Name ?? "",
            TopicId        = a.TopicId,
            TopicName      = a.Topic?.SubTopic ?? "",
            TopicCode      = null,
            UnitId         = a.Topic?.ModuleId ?? Guid.Empty,
            UnitName       = a.Topic?.Module?.Name ?? "",
            AssignedBy     = a.AssignedBy,
            AssignedByName = names.GetValueOrDefault(a.AssignedBy),
            AssignedDate   = a.AssignedDate,
            Notes          = a.Notes
        }).ToList();
    }

    public async Task<SchoolCurriculumDashboardDto> GetDashboardAsync(Guid schoolId)
    {
        var school = await _schoolRepo.GetByIdAsync(schoolId)
            ?? throw new KeyNotFoundException("School not found.");

        var assignedUnitCount  = await _unitAssignmentRepo.CountAsync(q => q.Where(a => a.SchoolId == schoolId));
        var assignedTopicCount = await _topicAssignmentRepo.CountAsync(q => q.Where(a => a.SchoolId == schoolId));
        var teacherCount       = await _teacherSchoolRepo.CountAsync(q => q.Where(ts => ts.SchoolId == schoolId && ts.IsActive));
        var studentCount       = await _studentRepo.CountAsync(q => q.Where(s => s.SchoolId == schoolId));

        var lastUnitAssignment = (await _unitAssignmentRepo.GetAllAsync(q =>
            q.Where(a => a.SchoolId == schoolId).OrderByDescending(a => a.AssignedDate).Take(1))).FirstOrDefault();
        var lastTopicAssignment = (await _topicAssignmentRepo.GetAllAsync(q =>
            q.Where(a => a.SchoolId == schoolId).OrderByDescending(a => a.AssignedDate).Take(1))).FirstOrDefault();

        var candidateDates = new List<DateTime>();
        if (lastUnitAssignment != null) candidateDates.Add(lastUnitAssignment.AssignedDate);
        if (lastTopicAssignment != null) candidateDates.Add(lastTopicAssignment.AssignedDate);

        return new SchoolCurriculumDashboardDto
        {
            SchoolId           = schoolId,
            SchoolName         = school.Name,
            AssignedUnitCount  = assignedUnitCount,
            AssignedTopicCount = assignedTopicCount,
            TeacherCount       = teacherCount,
            StudentCount       = studentCount,
            LastAssignmentDate = candidateDates.Count > 0 ? candidateDates.Max() : null
        };
    }

    public async Task<PagedResponse<CurriculumAssignmentAuditLogDto>> GetAuditLogAsync(CurriculumAssignmentAuditLogQueryDto query)
    {
        var (items, totalCount) = await _auditLogPagedRepo.GetPagedAsync(
            query,
            filter: q =>
            {
                if (query.SchoolId.HasValue) q = q.Where(a => a.SchoolId == query.SchoolId.Value);
                if (!string.IsNullOrWhiteSpace(query.EntityType)) q = q.Where(a => a.EntityType == query.EntityType);
                if (query.EntityId.HasValue) q = q.Where(a => a.EntityId == query.EntityId.Value);
                if (query.FromDate.HasValue) q = q.Where(a => a.DateTime >= query.FromDate.Value);
                if (query.ToDate.HasValue) q = q.Where(a => a.DateTime <= query.ToDate.Value);
                return q;
            },
            include: q => q.Include(a => a.School));

        var dtos = items.Select(a => new CurriculumAssignmentAuditLogDto
        {
            Id              = a.Id,
            SchoolId        = a.SchoolId,
            SchoolName      = a.School?.Name ?? "",
            EntityType      = a.EntityType,
            EntityId        = a.EntityId,
            EntityName      = a.EntityName,
            ActionPerformed = a.ActionPerformed,
            PerformedBy     = a.PerformedBy,
            UserName        = a.UserName,
            Role            = a.Role,
            DateTime        = a.DateTime,
            Notes           = a.Notes
        }).ToList();

        return PagedResponse<CurriculumAssignmentAuditLogDto>.Create(dtos, totalCount, query);
    }

    // ── Assign / Unassign ────────────────────────────────────────────────────

    public async Task<BulkCurriculumAssignmentResultDto> AssignUnitsToSchoolAsync(AssignUnitsToSchoolDto dto)
    {
        _ = await _schoolRepo.GetByIdAsync(dto.SchoolId)
            ?? throw new KeyNotFoundException("School not found.");

        var result = new BulkCurriculumAssignmentResultDto { RequestedCount = dto.UnitIds.Count };
        var (userId, userName, role) = ResolveActingUser();

        foreach (var unitId in dto.UnitIds.Distinct())
        {
            var unit = await _moduleRepo.GetByIdAsync(unitId, q => q.IgnoreQueryFilters().Where(m => !m.IsDeleted).Include(m => m.GradeLevel));
            if (unit == null)
            {
                result.Errors.Add(new BulkCurriculumAssignmentErrorDto { Id = unitId, Reason = "Unit not found." });
                continue;
            }

            if (TryGetGradeLevelNumber(unit.GradeLevel, out var unitLevel))
            {
                try
                {
                    await _gradeAccessService.EnsureLevelNumberAllowedAsync(dto.SchoolId, unitLevel);
                }
                catch (GradeAccessForbiddenException)
                {
                    result.Errors.Add(new BulkCurriculumAssignmentErrorDto
                    {
                        Id     = unitId,
                        Reason = $"Grade {unitLevel} is outside this school's configured grade range."
                    });
                    continue;
                }
            }

            var existing = (await _unitAssignmentRepo.GetAllAsync(q =>
                    q.IgnoreQueryFilters().Where(a => a.SchoolId == dto.SchoolId && a.UnitId == unitId)))
                .FirstOrDefault();

            if (existing != null && !existing.IsDeleted)
            {
                result.SkippedCount++;
                continue;
            }

            string action;
            if (existing != null)
            {
                existing.AssignedBy   = userId;
                existing.AssignedDate = DateTime.UtcNow;
                existing.Notes        = dto.Notes;
                await _unitAssignmentRepo.RestoreAsync(existing);
                action = "Restored";
            }
            else
            {
                await _unitAssignmentRepo.AddAsync(new SchoolUnitAssignment
                {
                    SchoolId     = dto.SchoolId,
                    UnitId       = unitId,
                    AssignedBy   = userId,
                    AssignedDate = DateTime.UtcNow,
                    Notes        = dto.Notes
                });
                action = "Assigned";
            }

            await WriteAuditLogAsync(dto.SchoolId, "Unit", unitId, unit.Name, action, userId, userName, role, dto.Notes);

            result.SucceededIds.Add(unitId);
            result.SucceededCount++;
        }

        return result;
    }

    public async Task<BulkCurriculumAssignmentResultDto> AssignTopicsToSchoolAsync(AssignTopicsToSchoolDto dto)
    {
        _ = await _schoolRepo.GetByIdAsync(dto.SchoolId)
            ?? throw new KeyNotFoundException("School not found.");

        var result = new BulkCurriculumAssignmentResultDto { RequestedCount = dto.TopicIds.Count };
        var (userId, userName, role) = ResolveActingUser();

        foreach (var topicId in dto.TopicIds.Distinct())
        {
            var topic = await _lessonRepo.GetByIdAsync(topicId, q => q.IgnoreQueryFilters().Where(t => !t.IsDeleted).Include(t => t.Module).ThenInclude(m => m.GradeLevel));
            if (topic == null)
            {
                result.Errors.Add(new BulkCurriculumAssignmentErrorDto { Id = topicId, Reason = "Topic not found." });
                continue;
            }

            if (TryGetGradeLevelNumber(topic.Module?.GradeLevel, out var topicLevel))
            {
                try
                {
                    await _gradeAccessService.EnsureLevelNumberAllowedAsync(dto.SchoolId, topicLevel);
                }
                catch (GradeAccessForbiddenException)
                {
                    result.Errors.Add(new BulkCurriculumAssignmentErrorDto
                    {
                        Id     = topicId,
                        Reason = $"Grade {topicLevel} is outside this school's configured grade range."
                    });
                    continue;
                }
            }

            var unitAssignedCount = await _unitAssignmentRepo.CountAsync(q =>
                q.Where(a => a.SchoolId == dto.SchoolId && a.UnitId == topic.ModuleId));

            if (unitAssignedCount == 0)
            {
                var parentUnit = await _moduleRepo.GetByIdAsync(topic.ModuleId, q => q.IgnoreQueryFilters().Where(m => !m.IsDeleted));
                if (parentUnit != null)
                {
                    var existingUnitAssign = (await _unitAssignmentRepo.GetAllAsync(q =>
                            q.IgnoreQueryFilters().Where(a => a.SchoolId == dto.SchoolId && a.UnitId == topic.ModuleId)))
                        .FirstOrDefault();

                    if (existingUnitAssign != null)
                    {
                        existingUnitAssign.AssignedBy   = userId;
                        existingUnitAssign.AssignedDate = DateTime.UtcNow;
                        existingUnitAssign.Notes        = dto.Notes ?? "Automatically assigned with topic.";
                        await _unitAssignmentRepo.RestoreAsync(existingUnitAssign);
                    }
                    else
                    {
                        await _unitAssignmentRepo.AddAsync(new SchoolUnitAssignment
                        {
                            SchoolId     = dto.SchoolId,
                            UnitId       = topic.ModuleId,
                            AssignedBy   = userId,
                            AssignedDate = DateTime.UtcNow,
                            Notes        = dto.Notes ?? "Automatically assigned with topic."
                        });
                    }
                    await WriteAuditLogAsync(dto.SchoolId, "Unit", topic.ModuleId, parentUnit.Name, "Assigned", userId, userName, role, dto.Notes ?? "Automatically assigned with topic.");
                }
                else
                {
                    result.Errors.Add(new BulkCurriculumAssignmentErrorDto
                    {
                        Id     = topicId,
                        Reason = "The parent Unit was not found."
                    });
                    continue;
                }
            }

            var existing = (await _topicAssignmentRepo.GetAllAsync(q =>
                    q.IgnoreQueryFilters().Where(a => a.SchoolId == dto.SchoolId && a.TopicId == topicId)))
                .FirstOrDefault();

            if (existing != null && !existing.IsDeleted)
            {
                result.SkippedCount++;
                continue;
            }

            string action;
            if (existing != null)
            {
                existing.AssignedBy   = userId;
                existing.AssignedDate = DateTime.UtcNow;
                existing.Notes        = dto.Notes;
                await _topicAssignmentRepo.RestoreAsync(existing);
                action = "Restored";
            }
            else
            {
                await _topicAssignmentRepo.AddAsync(new SchoolTopicAssignment
                {
                    SchoolId     = dto.SchoolId,
                    TopicId      = topicId,
                    AssignedBy   = userId,
                    AssignedDate = DateTime.UtcNow,
                    Notes        = dto.Notes
                });
                action = "Assigned";
            }

            await WriteAuditLogAsync(dto.SchoolId, "Topic", topicId, topic.SubTopic, action, userId, userName, role, dto.Notes);

            result.SucceededIds.Add(topicId);
            result.SucceededCount++;
        }

        return result;
    }

    public async Task<BulkCurriculumAssignmentResultDto> UnassignUnitsFromSchoolAsync(UnassignUnitsFromSchoolDto dto)
    {
        var result = new BulkCurriculumAssignmentResultDto { RequestedCount = dto.UnitIds.Count };
        var (userId, userName, role) = ResolveActingUser();

        foreach (var unitId in dto.UnitIds.Distinct())
        {
            var existing = (await _unitAssignmentRepo.GetAllAsync(q =>
                    q.Where(a => a.SchoolId == dto.SchoolId && a.UnitId == unitId)))
                .FirstOrDefault();

            if (existing == null)
            {
                result.SkippedCount++;
                continue;
            }

            var unit = await _moduleRepo.GetByIdAsync(unitId, q => q.IgnoreQueryFilters().Where(m => !m.IsDeleted));

            // Cascade: a School should never retain a Topic whose parent Unit it no longer has.
            var childTopicAssignments = await _topicAssignmentRepo.GetAllAsync(q =>
                q.Where(a => a.SchoolId == dto.SchoolId && a.Topic.ModuleId == unitId));

            foreach (var topicAssignment in childTopicAssignments)
            {
                var topic = await _lessonRepo.GetByIdAsync(topicAssignment.TopicId, q => q.IgnoreQueryFilters().Where(t => !t.IsDeleted));
                await _topicAssignmentRepo.DeleteAsync(topicAssignment);
                await WriteAuditLogAsync(
                    dto.SchoolId, "Topic", topicAssignment.TopicId, topic?.SubTopic ?? "Unknown",
                    "Unassigned", userId, userName, role, "Cascaded from parent Unit unassignment.");
            }

            await _unitAssignmentRepo.DeleteAsync(existing);
            await WriteAuditLogAsync(dto.SchoolId, "Unit", unitId, unit?.Name ?? "Unknown", "Unassigned", userId, userName, role, dto.Notes);

            result.SucceededIds.Add(unitId);
            result.SucceededCount++;
        }

        return result;
    }

    public async Task<BulkCurriculumAssignmentResultDto> UnassignTopicsFromSchoolAsync(UnassignTopicsFromSchoolDto dto)
    {
        var result = new BulkCurriculumAssignmentResultDto { RequestedCount = dto.TopicIds.Count };
        var (userId, userName, role) = ResolveActingUser();

        foreach (var topicId in dto.TopicIds.Distinct())
        {
            var existing = (await _topicAssignmentRepo.GetAllAsync(q =>
                    q.Where(a => a.SchoolId == dto.SchoolId && a.TopicId == topicId)))
                .FirstOrDefault();

            if (existing == null)
            {
                result.SkippedCount++;
                continue;
            }

            var topic = await _lessonRepo.GetByIdAsync(topicId, q => q.IgnoreQueryFilters().Where(t => !t.IsDeleted));
            await _topicAssignmentRepo.DeleteAsync(existing);
            await WriteAuditLogAsync(dto.SchoolId, "Topic", topicId, topic?.SubTopic ?? "Unknown", "Unassigned", userId, userName, role, dto.Notes);

            result.SucceededIds.Add(topicId);
            result.SucceededCount++;
        }

        return result;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /// <summary>
    /// Reads the numeric grade level (1-10) directly off a Unit/Topic's master GradeLevel.
    /// Returns false when the navigation wasn't loaded/found, in which case no range check
    /// is enforced (fails open, matching the "legacy data" handling used elsewhere in grade
    /// access checks).
    /// </summary>
    private static bool TryGetGradeLevelNumber(GradeLevel? gradeLevel, out int levelNumber)
    {
        levelNumber = gradeLevel?.LevelNumber ?? 0;
        return gradeLevel != null;
    }

    private async Task<Dictionary<Guid, string>> ResolveUserNamesAsync(IEnumerable<Guid> userIds)
    {
        var distinctIds = userIds.Distinct().ToList();
        if (distinctIds.Count == 0)
            return new();

        var users = await _userRepo.GetAllAsync(q => q.Where(u => distinctIds.Contains(u.Id)));
        return users.ToDictionary(u => u.Id, u => $"{u.FirstName} {u.LastName}".Trim());
    }

    private (Guid UserId, string UserName, string Role) ResolveActingUser()
    {
        var userId = Guid.TryParse(_currentUserService.UserId, out var id) ? id : Guid.Empty;
        var userName = _currentUserService.User?.Identity?.Name
            ?? _currentUserService.User?.FindFirst(ClaimTypes.Email)?.Value
            ?? "Anonymous User";
        var role = _currentUserService.Role ?? "User";
        return (userId, userName, role);
    }

    private async Task WriteAuditLogAsync(
        Guid schoolId, string entityType, Guid entityId, string entityName,
        string action, Guid performedBy, string userName, string role, string? notes)
    {
        await _auditLogRepo.AddAsync(new CurriculumAssignmentAuditLog
        {
            SchoolId        = schoolId,
            EntityType      = entityType,
            EntityId        = entityId,
            EntityName      = entityName,
            ActionPerformed = action,
            PerformedBy     = performedBy,
            UserName        = userName,
            Role            = role,
            DateTime        = DateTime.UtcNow,
            Notes           = notes
        });
    }
}
