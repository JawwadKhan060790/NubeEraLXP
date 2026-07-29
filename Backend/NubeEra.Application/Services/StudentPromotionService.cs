using System;
using System.Linq;
using System.Threading.Tasks;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Repositories;
using NubeEra.Application.Interfaces.Security;
using NubeEra.Application.Interfaces.Services;
using NubeEra.Domain.Common;
using NubeEra.Domain.Entities;

namespace NubeEra.Application.Services;

/// <summary>
/// Implements the minimal single-student promotion/transfer slice described in
/// IStudentPromotionService / StudentPromotionRequestDto. See those files'
/// XML docs for the explicit scope boundary versus the full bulk/audited
/// feature documented as a QA gap.
/// </summary>
public class StudentPromotionService : IStudentPromotionService
{
    private readonly IGenericRepository<Student> _studentRepository;
    private readonly IGenericRepository<Grade> _gradeRepository;
    private readonly IGenericRepository<InAppNotification> _notificationRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly ITenantService       _tenantService;
    private readonly IGradeAccessService _gradeAccessService;

    public StudentPromotionService(
        IGenericRepository<Student> studentRepository,
        IGenericRepository<Grade> gradeRepository,
        IGenericRepository<InAppNotification> notificationRepository,
        ICurrentUserService currentUserService,
        ITenantService tenantService,
        IGradeAccessService gradeAccessService)
    {
        _studentRepository = studentRepository;
        _gradeRepository = gradeRepository;
        _notificationRepository = notificationRepository;
        _currentUserService = currentUserService;
        _tenantService       = tenantService;
        _gradeAccessService = gradeAccessService;
    }

    public async Task PromoteOrTransferAsync(Guid studentId, StudentPromotionRequestDto dto)
    {
        var student = await _studentRepository.GetByIdAsync(studentId)
            ?? throw new AppException("Student not found.");

        // School-scoping check — the same ownership guard used elsewhere (e.g.
        // StudentService.UpdateAsync, the Attendance fixes) so a Principal/Admin
        // from one school cannot promote/transfer a student belonging to another.
        var callerSchoolId = _tenantService.GetEffectiveSchoolId();
        if (callerSchoolId.HasValue && student.SchoolId != callerSchoolId.Value)
        {
            throw new UnauthorizedAccessException("You are not authorized to modify a student outside your school.");
        }

        // Centralized enforcement: the destination grade must be accessible to the
        // current user (within their school's standardized grade range). Blocks IDOR
        // via a manipulated ToGradeId — single source of truth, no bespoke checks.
        await _gradeAccessService.EnsureGradeAccessibleToCurrentUserAsync(dto.ToGradeId);

        var targetGrade = await _gradeRepository.GetByIdAsync(dto.ToGradeId)
            ?? throw new AppException("Target grade not found.");

        var targetSchoolId = dto.ToSchoolId ?? student.SchoolId;

        // Cross-school transfer guard: the destination grade must actually belong
        // to the destination school — otherwise a student could end up with a
        // GradeId that points at another school's grade, an inconsistent state
        // none of the existing read-paths expect.
        if (targetGrade.SchoolId != targetSchoolId)
        {
            throw new AppException("The target grade does not belong to the target school.");
        }

        // A non-school-scoped caller (SuperAdmin) performing a cross-school
        // transfer is allowed; a school-scoped caller (Principal) is not, since
        // their authority — and the school-scoping guard above — is bound to
        // their own school.
        if (callerSchoolId.HasValue && targetSchoolId != callerSchoolId.Value)
        {
            throw new UnauthorizedAccessException("Cross-school transfers must be performed by a Super Admin.");
        }

        var fromGradeName = (await _gradeRepository.GetByIdAsync(student.GradeId))?.GradeName ?? "their previous grade";
        var toGradeName = targetGrade.GradeName;
        var crossSchool = targetSchoolId != student.SchoolId;

        student.GradeId = targetGrade.Id;
        student.SchoolId = targetSchoolId;
        await _studentRepository.UpdateAsync(student);

        // Best-effort notification to the student's own linked account — mirrors
        // the existing NotifyUserAsync pattern in EventService (same entity, same
        // UserId-filtered read path the NotificationBell already polls). Parents
        // see the change reflected automatically the next time their dashboard
        // recomputes the child's grade/module breakdown — no separate parent
        // notification is required, consistent with the approach already used for
        // event notifications.
        if (student.UserId.HasValue)
        {
            var reasonSuffix = string.IsNullOrWhiteSpace(dto.Reason) ? "" : $" ({dto.Reason})";
            var message = crossSchool
                ? $"You have been transferred from {fromGradeName} to {toGradeName} in a new school{reasonSuffix}."
                : $"You have been promoted from {fromGradeName} to {toGradeName}{reasonSuffix}.";

            await _notificationRepository.AddAsync(new InAppNotification
            {
                Id = Guid.NewGuid(),
                UserId = student.UserId.Value,
                Message = message,
                LinkUrl = "/dashboard",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });
        }

        // Lightweight audit trail via console logging — mirrors the convention
        // already used for OTP/email "[MAIL SIMULATION]" output, and gives ops
        // visibility into promotions until the dedicated StudentPromotionHistory
        // table (see scope note) is introduced via migration.
        Console.WriteLine(
            $"\n[STUDENT PROMOTION] {student.FirstName} {student.LastName} (StudentId={student.StudentId}) " +
            $"moved from \"{fromGradeName}\" to \"{toGradeName}\"" +
            (crossSchool ? " (cross-school transfer)" : "") +
            (string.IsNullOrWhiteSpace(dto.Reason) ? "" : $" — Reason: {dto.Reason}") +
            $" — performed by user {_currentUserService.UserId}\n");
    }
}
