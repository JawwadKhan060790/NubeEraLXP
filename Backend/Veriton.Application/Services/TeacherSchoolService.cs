using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Veriton.Application.Common.Models;
using Veriton.Application.DTOs;
using Veriton.Application.Interfaces.Repositories;
using Veriton.Application.Interfaces.Security;
using Veriton.Application.Interfaces.Services;
using Veriton.Domain.Entities;

namespace Veriton.Application.Services;

/// <summary>
/// See <see cref="ITeacherSchoolService"/> for the full business-rule summary
/// (restore-on-reassign, primary-school invariant kept in sync with
/// Teacher.SchoolId / User.SchoolId, protected-primary / last-school guards,
/// audit logging).
/// </summary>
public class TeacherSchoolService : ITeacherSchoolService
{
    private readonly IGenericRepository<TeacherSchool>         _repo;
    private readonly IPagedRepository<TeacherSchool>           _pagedRepo;
    private readonly IGenericRepository<TeacherSchoolAuditLog> _auditLogRepo;
    private readonly IPagedRepository<TeacherSchoolAuditLog>   _auditLogPagedRepo;
    private readonly IGenericRepository<Teacher>                _teacherRepo;
    private readonly IGenericRepository<School>                 _schoolRepo;
    private readonly IUserRepository                            _userRepository;
    private readonly ICurrentUserService                        _currentUserService;

    public TeacherSchoolService(
        IGenericRepository<TeacherSchool>         repo,
        IPagedRepository<TeacherSchool>           pagedRepo,
        IGenericRepository<TeacherSchoolAuditLog> auditLogRepo,
        IPagedRepository<TeacherSchoolAuditLog>   auditLogPagedRepo,
        IGenericRepository<Teacher>                teacherRepo,
        IGenericRepository<School>                 schoolRepo,
        IUserRepository                            userRepository,
        ICurrentUserService                        currentUserService)
    {
        _repo               = repo;
        _pagedRepo           = pagedRepo;
        _auditLogRepo        = auditLogRepo;
        _auditLogPagedRepo   = auditLogPagedRepo;
        _teacherRepo         = teacherRepo;
        _schoolRepo          = schoolRepo;
        _userRepository      = userRepository;
        _currentUserService  = currentUserService;
    }

    // ── Reads ────────────────────────────────────────────────────────────────

    public async Task<List<TeacherSchoolDto>> GetByTeacherAsync(Guid teacherId)
    {
        _ = await _teacherRepo.GetByIdAsync(teacherId)
            ?? throw new KeyNotFoundException("Teacher not found.");

        var rows = await _repo.GetAllAsync(q =>
            q.Where(ts => ts.TeacherId == teacherId)
             .Include(ts => ts.Teacher)
             .Include(ts => ts.School)
             .OrderByDescending(ts => ts.IsPrimary)
             .ThenBy(ts => ts.School.Name));

        var names = await ResolveUserNamesAsync(rows.Select(r => r.AssignedBy));
        return rows.Select(r => MapToDto(r, names)).ToList();
    }

    public async Task<List<TeacherAvailableSchoolDto>> GetAvailableSchoolsForLoginAsync(Guid teacherId)
    {
        var rows = await _repo.GetAllAsync(q =>
            q.Where(ts => ts.TeacherId == teacherId && ts.IsActive)
             .Include(ts => ts.School)
             .OrderByDescending(ts => ts.IsPrimary)
             .ThenBy(ts => ts.School.Name));

        return rows.Select(r => new TeacherAvailableSchoolDto
        {
            SchoolId   = r.SchoolId,
            SchoolName = r.School?.Name ?? "",
            IsPrimary  = r.IsPrimary,
            IsActive   = r.IsActive
        }).ToList();
    }

    public async Task<PagedResponse<TeacherSchoolDto>> GetPagedAsync(TeacherSchoolQueryDto query)
    {
        var (items, totalCount) = await _pagedRepo.GetPagedAsync(
            query,
            filter: q =>
            {
                if (query.TeacherId.HasValue) q = q.Where(ts => ts.TeacherId == query.TeacherId.Value);
                if (query.SchoolId.HasValue) q = q.Where(ts => ts.SchoolId == query.SchoolId.Value);
                if (query.IsActive.HasValue) q = q.Where(ts => ts.IsActive == query.IsActive.Value);
                return q;
            },
            include: q => q.Include(ts => ts.Teacher).Include(ts => ts.School));

        var names = await ResolveUserNamesAsync(items.Select(i => i.AssignedBy));
        var dtos = items.Select(i => MapToDto(i, names)).ToList();

        return PagedResponse<TeacherSchoolDto>.Create(dtos, totalCount, query);
    }

    public async Task<PagedResponse<TeacherSchoolAuditLogDto>> GetAuditLogAsync(TeacherSchoolAuditLogQueryDto query)
    {
        var (items, totalCount) = await _auditLogPagedRepo.GetPagedAsync(
            query,
            filter: q =>
            {
                if (query.TeacherId.HasValue) q = q.Where(a => a.TeacherId == query.TeacherId.Value);
                if (query.SchoolId.HasValue) q = q.Where(a => a.SchoolId == query.SchoolId.Value);
                if (query.FromDate.HasValue) q = q.Where(a => a.DateTime >= query.FromDate.Value);
                if (query.ToDate.HasValue) q = q.Where(a => a.DateTime <= query.ToDate.Value);
                return q;
            });

        var dtos = items.Select(a => new TeacherSchoolAuditLogDto
        {
            Id              = a.Id,
            TeacherId       = a.TeacherId,
            TeacherName     = a.TeacherName,
            SchoolId        = a.SchoolId,
            SchoolName      = a.SchoolName,
            ActionPerformed = a.ActionPerformed,
            PerformedBy     = a.PerformedBy,
            UserName        = a.UserName,
            Role            = a.Role,
            DateTime        = a.DateTime,
            Notes           = a.Notes
        }).ToList();

        return PagedResponse<TeacherSchoolAuditLogDto>.Create(dtos, totalCount, query);
    }

    // ── Writes ───────────────────────────────────────────────────────────────

    public async Task SyncTeacherSchoolsAsync(TeacherSchoolAssignmentSetDto dto)
    {
        var teacher = await _teacherRepo.GetByIdAsync(dto.TeacherId)
            ?? throw new KeyNotFoundException("Teacher not found.");

        var (userId, userName, role) = ResolveActingUser();
        var teacherName = $"{teacher.FirstName} {teacher.LastName}".Trim();
        var distinctSchoolIds = dto.SchoolIds.Distinct().ToList();

        foreach (var schoolId in distinctSchoolIds)
        {
            var school = await _schoolRepo.GetByIdAsync(schoolId)
                ?? throw new KeyNotFoundException($"School '{schoolId}' not found.");

            var existing = (await _repo.GetAllAsync(q =>
                    q.IgnoreQueryFilters().Where(ts => ts.TeacherId == dto.TeacherId && ts.SchoolId == schoolId)))
                .FirstOrDefault();

            if (existing == null)
            {
                await _repo.AddAsync(new TeacherSchool
                {
                    TeacherId    = dto.TeacherId,
                    SchoolId     = schoolId,
                    IsActive     = true,
                    IsPrimary    = false,
                    AssignedBy   = userId,
                    AssignedDate = DateTime.UtcNow,
                    Notes        = dto.Notes
                });
                await WriteAuditLogAsync(dto.TeacherId, schoolId, teacherName, school.Name, "Assigned", userId, userName, role, dto.Notes);
            }
            else if (existing.IsDeleted)
            {
                existing.AssignedBy   = userId;
                existing.AssignedDate = DateTime.UtcNow;
                existing.Notes        = dto.Notes;
                existing.IsActive     = true;
                await _repo.RestoreAsync(existing);
                await WriteAuditLogAsync(dto.TeacherId, schoolId, teacherName, school.Name, "Restored", userId, userName, role, dto.Notes);
            }
            // else: already an active membership — leave untouched (see DTO doc comment).
        }

        // Primary-school resolution: explicit request wins; otherwise auto-pick only if
        // the Teacher currently has no primary at all (e.g. right after creation).
        if (dto.PrimarySchoolId.HasValue)
        {
            var targetRow = (await _repo.GetAllAsync(q =>
                    q.Where(ts => ts.TeacherId == dto.TeacherId && ts.SchoolId == dto.PrimarySchoolId.Value)))
                .FirstOrDefault()
                ?? throw new InvalidOperationException("The requested primary School is not an active membership for this Teacher.");

            await SetPrimaryInternalAsync(teacher, targetRow, userId, userName, role);
        }
        else
        {
            var hasPrimary = await _repo.CountAsync(q => q.Where(ts => ts.TeacherId == dto.TeacherId && ts.IsPrimary)) > 0;
            if (!hasPrimary && distinctSchoolIds.Count > 0)
            {
                var fallbackRow = (await _repo.GetAllAsync(q =>
                        q.Where(ts => ts.TeacherId == dto.TeacherId && ts.SchoolId == distinctSchoolIds[0])))
                    .FirstOrDefault();

                if (fallbackRow != null)
                    await SetPrimaryInternalAsync(teacher, fallbackRow, userId, userName, role);
            }
        }
    }

    public async Task<TeacherSchoolBulkResultDto> AssignToSchoolsAsync(AssignTeacherToSchoolsDto dto)
    {
        var teacher = await _teacherRepo.GetByIdAsync(dto.TeacherId)
            ?? throw new KeyNotFoundException("Teacher not found.");

        var result = new TeacherSchoolBulkResultDto { RequestedCount = dto.SchoolIds.Count };
        var (userId, userName, role) = ResolveActingUser();
        var teacherName = $"{teacher.FirstName} {teacher.LastName}".Trim();

        foreach (var schoolId in dto.SchoolIds.Distinct())
        {
            var school = await _schoolRepo.GetByIdAsync(schoolId);
            if (school == null)
            {
                result.Errors.Add(new TeacherSchoolBulkErrorDto { Id = schoolId, Reason = "School not found." });
                continue;
            }

            var existing = (await _repo.GetAllAsync(q =>
                    q.IgnoreQueryFilters().Where(ts => ts.TeacherId == dto.TeacherId && ts.SchoolId == schoolId)))
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
                existing.IsActive     = true;
                await _repo.RestoreAsync(existing);
                action = "Restored";
            }
            else
            {
                await _repo.AddAsync(new TeacherSchool
                {
                    TeacherId    = dto.TeacherId,
                    SchoolId     = schoolId,
                    IsActive     = true,
                    IsPrimary    = false,
                    AssignedBy   = userId,
                    AssignedDate = DateTime.UtcNow,
                    Notes        = dto.Notes
                });
                action = "Assigned";
            }

            await WriteAuditLogAsync(dto.TeacherId, schoolId, teacherName, school.Name, action, userId, userName, role, dto.Notes);

            result.SucceededIds.Add(schoolId);
            result.SucceededCount++;
        }

        // Guarantee the Teacher ends up with exactly one primary once they have >= 1 school.
        var hasPrimary = await _repo.CountAsync(q => q.Where(ts => ts.TeacherId == dto.TeacherId && ts.IsPrimary)) > 0;
        if (!hasPrimary && result.SucceededIds.Count > 0)
        {
            var fallbackRow = (await _repo.GetAllAsync(q =>
                    q.Where(ts => ts.TeacherId == dto.TeacherId && ts.SchoolId == result.SucceededIds[0])))
                .FirstOrDefault();

            if (fallbackRow != null)
                await SetPrimaryInternalAsync(teacher, fallbackRow, userId, userName, role);
        }

        return result;
    }

    public async Task RemoveAsync(RemoveTeacherSchoolDto dto)
    {
        var existing = (await _repo.GetAllAsync(q =>
                q.Where(ts => ts.TeacherId == dto.TeacherId && ts.SchoolId == dto.SchoolId)
                 .Include(ts => ts.Teacher)
                 .Include(ts => ts.School)))
            .FirstOrDefault()
            ?? throw new KeyNotFoundException("Teacher is not currently assigned to this school.");

        if (existing.IsPrimary)
            throw new InvalidOperationException("Cannot remove a Teacher's primary School. Set another School as primary first.");

        var membershipCount = await _repo.CountAsync(q => q.Where(ts => ts.TeacherId == dto.TeacherId));
        if (membershipCount <= 1)
            throw new InvalidOperationException("Cannot remove a Teacher's only remaining School assignment. Assign another School first.");

        var teacherName = existing.Teacher != null ? $"{existing.Teacher.FirstName} {existing.Teacher.LastName}".Trim() : "Unknown";
        var schoolName = existing.School?.Name ?? "Unknown";

        await _repo.DeleteAsync(existing);

        var (userId, userName, role) = ResolveActingUser();
        await WriteAuditLogAsync(dto.TeacherId, dto.SchoolId, teacherName, schoolName, "Unassigned", userId, userName, role, dto.Notes);
    }

    public async Task SetStatusAsync(Guid teacherId, Guid schoolId, UpdateTeacherSchoolStatusDto dto)
    {
        var existing = (await _repo.GetAllAsync(q =>
                q.Where(ts => ts.TeacherId == teacherId && ts.SchoolId == schoolId)
                 .Include(ts => ts.Teacher)
                 .Include(ts => ts.School)))
            .FirstOrDefault()
            ?? throw new KeyNotFoundException("Teacher is not currently assigned to this school.");

        if (!dto.IsActive)
        {
            if (existing.IsPrimary)
                throw new InvalidOperationException("Cannot deactivate a Teacher's primary School. Set another School as primary first.");

            var activeCount = await _repo.CountAsync(q => q.Where(ts => ts.TeacherId == teacherId && ts.IsActive));
            if (activeCount <= 1)
                throw new InvalidOperationException("Cannot deactivate a Teacher's only active School assignment.");
        }

        existing.IsActive = dto.IsActive;
        if (dto.Notes != null)
            existing.Notes = dto.Notes;

        await _repo.UpdateAsync(existing);

        var teacherName = existing.Teacher != null ? $"{existing.Teacher.FirstName} {existing.Teacher.LastName}".Trim() : "Unknown";
        var schoolName = existing.School?.Name ?? "Unknown";
        var (userId, userName, role) = ResolveActingUser();
        await WriteAuditLogAsync(teacherId, schoolId, teacherName, schoolName, dto.IsActive ? "Activated" : "Deactivated", userId, userName, role, dto.Notes);
    }

    public async Task SetPrimaryAsync(SetPrimaryTeacherSchoolDto dto)
    {
        var teacher = await _teacherRepo.GetByIdAsync(dto.TeacherId)
            ?? throw new KeyNotFoundException("Teacher not found.");

        var targetRow = (await _repo.GetAllAsync(q => q.Where(ts => ts.TeacherId == dto.TeacherId && ts.SchoolId == dto.SchoolId)))
            .FirstOrDefault()
            ?? throw new KeyNotFoundException("Teacher is not currently assigned to this school.");

        if (!targetRow.IsActive)
            throw new InvalidOperationException("Cannot set an inactive School as the Teacher's primary. Activate it first.");

        var (userId, userName, role) = ResolveActingUser();
        await SetPrimaryInternalAsync(teacher, targetRow, userId, userName, role);
    }

    public async Task RemoveAllForTeacherAsync(Guid teacherId, string? reason = null)
    {
        var rows = await _repo.GetAllAsync(q => q.Where(ts => ts.TeacherId == teacherId).Include(ts => ts.Teacher).Include(ts => ts.School));
        if (rows.Count == 0)
            return;

        var teacherName = rows[0].Teacher != null ? $"{rows[0].Teacher.FirstName} {rows[0].Teacher.LastName}".Trim() : "Unknown";
        var (userId, userName, role) = ResolveActingUser();

        foreach (var row in rows)
        {
            var schoolName = row.School?.Name ?? "Unknown";
            await _repo.DeleteAsync(row);
            await WriteAuditLogAsync(teacherId, row.SchoolId, teacherName, schoolName, "Unassigned", userId, userName, role, reason ?? "Teacher record deleted.");
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /// <summary>
    /// Promotes <paramref name="targetRow"/> to the Teacher's sole primary School:
    /// clears IsPrimary on every sibling row, sets it on the target, and mirrors
    /// the change onto Teacher.SchoolId and the linked User.SchoolId (the claim
    /// embedded in the JWT on next login).
    /// </summary>
    private async Task SetPrimaryInternalAsync(Teacher teacher, TeacherSchool targetRow, Guid userId, string userName, string role)
    {
        if (targetRow.IsPrimary && teacher.SchoolId == targetRow.SchoolId)
            return;

        var siblings = await _repo.GetAllAsync(q =>
            q.Where(ts => ts.TeacherId == teacher.Id && ts.IsPrimary && ts.Id != targetRow.Id));

        foreach (var sibling in siblings)
        {
            sibling.IsPrimary = false;
            await _repo.UpdateAsync(sibling);
        }

        targetRow.IsPrimary = true;
        await _repo.UpdateAsync(targetRow);

        teacher.SchoolId = targetRow.SchoolId;
        await _teacherRepo.UpdateAsync(teacher);

        var user = await _userRepository.GetByIdAsync(teacher.UserId);
        if (user != null)
        {
            user.SchoolId = targetRow.SchoolId;
            await _userRepository.UpdateAsync(user);
        }

        var school = await _schoolRepo.GetByIdAsync(targetRow.SchoolId);
        var teacherName = $"{teacher.FirstName} {teacher.LastName}".Trim();
        await WriteAuditLogAsync(teacher.Id, targetRow.SchoolId, teacherName, school?.Name ?? "", "PrimaryChanged", userId, userName, role, "Set as primary/home school.");
    }

    private async Task<Dictionary<Guid, string>> ResolveUserNamesAsync(IEnumerable<Guid> userIds)
    {
        var distinctIds = userIds.Distinct().ToList();
        if (distinctIds.Count == 0)
            return new();

        var users = await _userRepository.GetAllAsync(q => q.Where(u => distinctIds.Contains(u.Id)));
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
        Guid teacherId, Guid schoolId, string teacherName, string schoolName,
        string action, Guid performedBy, string userName, string role, string? notes)
    {
        await _auditLogRepo.AddAsync(new TeacherSchoolAuditLog
        {
            TeacherId       = teacherId,
            SchoolId        = schoolId,
            TeacherName     = teacherName,
            SchoolName      = schoolName,
            ActionPerformed = action,
            PerformedBy     = performedBy,
            UserName        = userName,
            Role            = role,
            DateTime        = DateTime.UtcNow,
            Notes           = notes
        });
    }

    private static TeacherSchoolDto MapToDto(TeacherSchool ts, Dictionary<Guid, string> names) => new()
    {
        Id             = ts.Id,
        TeacherId      = ts.TeacherId,
        TeacherName    = ts.Teacher != null ? $"{ts.Teacher.FirstName} {ts.Teacher.LastName}".Trim() : "",
        SchoolId       = ts.SchoolId,
        SchoolName     = ts.School?.Name ?? "",
        IsActive       = ts.IsActive,
        IsPrimary      = ts.IsPrimary,
        AssignedBy     = ts.AssignedBy,
        AssignedByName = names.GetValueOrDefault(ts.AssignedBy),
        AssignedDate   = ts.AssignedDate,
        Notes          = ts.Notes
    };
}
