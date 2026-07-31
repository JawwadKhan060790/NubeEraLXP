using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Veriton.Application.DTOs;
using Veriton.Application.Interfaces.Repositories;
using Veriton.Application.Interfaces.Services.Event;
using Veriton.Application.Interfaces.Security;
using Veriton.Domain.Entities;
using Veriton.Domain.Common;

namespace Veriton.Application.Services.Event;

public class EventService : IEventService
{
    private readonly IGenericRepository<Domain.Entities.Event> _eventRepository;
    private readonly IGenericRepository<EventRegistration> _registrationRepository;
    private readonly IGenericRepository<EventAuditLog> _auditLogRepository;
    private readonly IGenericRepository<InAppNotification> _notificationRepository;
    private readonly IGenericRepository<Student> _studentRepository;
    private readonly IUserRepository _userRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly ITenantService       _tenantService;

    public EventService(
        IGenericRepository<Domain.Entities.Event> eventRepository,
        IGenericRepository<EventRegistration> registrationRepository,
        IGenericRepository<EventAuditLog> auditLogRepository,
        IGenericRepository<InAppNotification> notificationRepository,
        IGenericRepository<Student> studentRepository,
        IUserRepository userRepository,
        ICurrentUserService currentUserService,
        ITenantService tenantService 
       )
    {
        _eventRepository = eventRepository;
        _registrationRepository = registrationRepository;
        _auditLogRepository = auditLogRepository;
        _notificationRepository = notificationRepository;
        _studentRepository = studentRepository;
        _userRepository = userRepository;
        _currentUserService = currentUserService;
        _tenantService       = tenantService;
    }

    /// <summary>
    /// Creates an in-app notification for a single user. Centralised so every
    /// event-related workflow (creation, registration, status changes) feeds the
    /// notification bell / dashboards consistently instead of silently doing nothing.
    /// </summary>
    private async Task NotifyUserAsync(Guid userId, string message, string linkUrl)
    {
        await _notificationRepository.AddAsync(new InAppNotification
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Message = message,
            LinkUrl = linkUrl,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        });
    }

    /// <summary>
    /// Notifies every active student (with a linked user account) in the given school.
    /// Used when a new event is published so the student dashboard / notification bell
    /// reflect it immediately, per the event-creation workflow requirements.
    /// </summary>
    private async Task NotifySchoolStudentsAsync(Guid? schoolId, string message, string linkUrl)
    {
        var students = await _studentRepository.GetAllAsync(q => q
            .Where(s => (schoolId == null || s.SchoolId == schoolId.Value) && s.IsActive && s.UserId != null));

        foreach (var student in students)
        {
            await NotifyUserAsync(student.UserId!.Value, message, linkUrl);
        }
    }

    private async Task LogAuditEventAsync(Guid? schoolId, string action)
    {
        var userName = _currentUserService.User?.Identity?.Name 
            ?? _currentUserService.User?.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value 
            ?? "Anonymous User";

        var newLog = new EventAuditLog
        {
            Id = Guid.NewGuid(),
            SchoolId = schoolId,
            UserName = userName,
            Role = _currentUserService.Role ?? "User",
            DateTime = DateTime.UtcNow,
            ActionPerformed = action,
            CreatedAt = DateTime.UtcNow
        };
        await _auditLogRepository.AddAsync(newLog);
    }

    public async Task<List<object>> GetEventsAsync()
    {
        var schoolId = _tenantService.GetEffectiveSchoolId();

        var events = await _eventRepository.GetAllAsync(q =>
        {
            IQueryable<Domain.Entities.Event> query = q.Include(e => e.Registrations);
            // Tenant-scope: restrict to the caller's school when one is in context.
            // SuperAdmin/Admin with no X-School-Id header see all events (schoolId == null).
            if (schoolId.HasValue)
                query = query.Where(e => e.SchoolId == schoolId.Value || e.SchoolId == null);
            return query.OrderByDescending(e => e.Date);
        });

        return events.Select(e => (object)new
        {
            e.Id,
            SchoolId = e.SchoolId,
            e.Title,
            e.Description,
            e.Category,
            e.Date,
            e.Deadline,
            e.Venue,
            e.MaxParticipants,
            e.MaxTeams,
            e.WaitlistLimit,
            e.AutoApproval,
            // Only count registrations that are still actively holding a seat or
            // waitlist slot — cancelled/rejected ones have released their place and
            // must not inflate the displayed headcount (see RegisterForEventAsync).
            RegisteredCount = e.Registrations.Count(r => !ReleasedSeatStatuses.Contains(r.Status)),
            e.Status,
            CustomFields = JsonSerializer.Deserialize<string[]>(e.CustomFieldsJson) ?? Array.Empty<string>()
        }).ToList();
    }

    public async Task<object?> GetEventByIdAsync(Guid id)
    {
        var events = await _eventRepository.GetAllAsync(q => q
            .Include(e => e.Registrations)
            .Where(e => e.Id == id));
        var ev = events.FirstOrDefault();

        if (ev == null) return null;

        return new
        {
            ev.Id,
            SchoolId = ev.SchoolId,
            ev.Title,
            ev.Description,
            ev.Category,
            ev.Date,
            ev.Deadline,
            ev.Venue,
            ev.MaxParticipants,
            ev.MaxTeams,
            ev.WaitlistLimit,
            ev.AutoApproval,
            RegisteredCount = ev.Registrations.Count(r => !ReleasedSeatStatuses.Contains(r.Status)),
            ev.Status,
            CustomFields = JsonSerializer.Deserialize<string[]>(ev.CustomFieldsJson) ?? Array.Empty<string>()
        };
    }

    public async Task<Domain.Entities.Event> CreateEventAsync(CreateEventDto dto)
    {
        Guid? schoolId = null;
        var role = _currentUserService.Role ?? string.Empty;
        var isPlatformWide = new[] { AppRoles.SuperAdmin, AppRoles.Admin, AppRoles.Staff }.Contains(role, StringComparer.OrdinalIgnoreCase);

        if (dto.SchoolId.HasValue && dto.SchoolId.Value != Guid.Empty)
        {
            schoolId = dto.SchoolId.Value;
        }
        else if (!isPlatformWide)
        {
            schoolId = _tenantService.GetEffectiveSchoolId();
            if (!schoolId.HasValue)
            {
                throw new AppException("School context not found.");
            }
        }

        var ev = new Domain.Entities.Event
        {
            Id = Guid.NewGuid(),
            SchoolId = schoolId,
            Title = dto.Title,
            Description = dto.Description,
            Category = dto.Category,
            Date = dto.Date,
            Deadline = dto.Deadline,
            Venue = dto.Venue,
            MaxParticipants = dto.MaxParticipants,
            MaxTeams = dto.MaxTeams,
            WaitlistLimit = dto.WaitlistLimit,
            AutoApproval = dto.AutoApproval,
            Status = "Upcoming",
            CustomFieldsJson = JsonSerializer.Serialize(dto.CustomFields ?? Array.Empty<string>()),
            CreatedAt = DateTime.UtcNow
        };

        await _eventRepository.AddAsync(ev);
        await LogAuditEventAsync(schoolId, $"Created new Event \"{ev.Title}\" in category \"{ev.Category}\"");

        // Notify students in this school so the bell / dashboard reflect the new event.
        // (Parents see the same data via the parent dashboard, which derives from their
        // children's records, so no separate parent notification is required here.)
        await NotifySchoolStudentsAsync(
            schoolId,
            $"New event \"{ev.Title}\" has been scheduled on {ev.Date:yyyy-MM-dd}. Registration closes {ev.Deadline:yyyy-MM-dd}.",
            $"/events/{ev.Id}");

        return ev;
    }

    public async Task<Domain.Entities.Event> UpdateEventAsync(Guid id, CreateEventDto dto)
    {
        var ev = await _eventRepository.GetByIdAsync(id);
        if (ev == null) throw new AppException("Event not found.");

        // Capture pre-update values for change detection. We only want to notify
        // attendees about edits that actually matter to them (date/deadline/venue/title) —
        // not, say, a description typo fix — so we diff old vs. new below and build a
        // targeted "what changed" message rather than a generic "something changed" notice.
        // (Closes QA gap: "Event update/cancellation triggers re-notification".)
        var oldTitle = ev.Title;
        var oldDate = ev.Date;
        var oldDeadline = ev.Deadline;
        var oldVenue = ev.Venue;

        Guid? schoolId = null;
        var role = _currentUserService.Role ?? string.Empty;
        var isPlatformWide = new[] { AppRoles.SuperAdmin, AppRoles.Admin, AppRoles.Staff }.Contains(role, StringComparer.OrdinalIgnoreCase);

        if (dto.SchoolId.HasValue && dto.SchoolId.Value != Guid.Empty)
        {
            schoolId = dto.SchoolId.Value;
        }
        else if (!isPlatformWide)
        {
            schoolId = _tenantService.GetEffectiveSchoolId();
        }

        ev.SchoolId = schoolId;
        ev.Title = dto.Title;
        ev.Description = dto.Description;
        ev.Category = dto.Category;
        ev.Date = dto.Date;
        ev.Deadline = dto.Deadline;
        ev.Venue = dto.Venue;
        ev.MaxParticipants = dto.MaxParticipants;
        ev.MaxTeams = dto.MaxTeams;
        ev.WaitlistLimit = dto.WaitlistLimit;
        ev.AutoApproval = dto.AutoApproval;
        ev.CustomFieldsJson = JsonSerializer.Serialize(dto.CustomFields ?? Array.Empty<string>());

        await _eventRepository.UpdateAsync(ev);
        await LogAuditEventAsync(ev.SchoolId, $"Updated event \"{ev.Title}\"");

        var changes = new List<string>();
        if (oldTitle != ev.Title) changes.Add($"title changed to \"{ev.Title}\"");
        if (oldDate != ev.Date) changes.Add($"date moved to {ev.Date:yyyy-MM-dd}");
        if (oldDeadline != ev.Deadline) changes.Add($"registration deadline moved to {ev.Deadline:yyyy-MM-dd}");
        if (oldVenue != ev.Venue) changes.Add($"venue changed to \"{ev.Venue}\"");

        if (changes.Any())
        {
            await NotifySchoolStudentsAsync(
                ev.SchoolId,
                $"Event \"{oldTitle}\" was updated: {string.Join("; ", changes)}.",
                $"/events/{ev.Id}");
        }

        return ev;
    }

    public async Task DeleteEventAsync(Guid id)
    {
        var ev = await _eventRepository.GetByIdAsync(id);
        if (ev == null) throw new AppException("Event not found.");

        // Capture details before the entity is removed — we still want to notify
        // previously-informed attendees that the event is gone. (Closes QA gap:
        // "Event update/cancellation triggers re-notification".)
        var title = ev.Title;
        var schoolId = ev.SchoolId;
        var eventDate = ev.Date;

        await _eventRepository.DeleteAsync(ev);
        await LogAuditEventAsync(schoolId, $"Deleted event \"{title}\"");

        // Notify after the delete succeeds, so a failed delete never produces a false
        // cancellation notice. Link to the events listing rather than the (now-deleted)
        // event detail page.
        await NotifySchoolStudentsAsync(
            schoolId,
            $"Event \"{title}\" originally scheduled on {eventDate:yyyy-MM-dd} has been cancelled.",
            "/events");
    }

    public async Task<List<object>> GetRegistrationsAsync()
    {
        var role = _currentUserService.Role ?? "";
        var userIdStr = _currentUserService.UserId;
        var schoolId = _tenantService.GetEffectiveSchoolId();

        List<EventRegistration> regs;

        if (role.Equals("Student", StringComparison.OrdinalIgnoreCase))
        {
            var studentId = _currentUserService.StudentId;
            if (studentId.HasValue)
            {
                regs = await _registrationRepository.GetAllAsync(q => q
                    .Include(r => r.Event)
                    .Where(r => r.StudentId == studentId.Value)
                    .OrderByDescending(r => r.CreatedAt));
            }
            else
            {
                regs = new List<EventRegistration>();
            }
        }
        else if (role.Equals("Parent", StringComparison.OrdinalIgnoreCase))
        {
            if (!string.IsNullOrEmpty(userIdStr))
            {
                var parentUser = await _userRepository.GetByIdAsync(Guid.Parse(userIdStr));
                if (parentUser != null)
                {
                    var parentPhone = parentUser.Phone?.Trim();
                    var parentEmail = parentUser.Email?.Trim().ToLower();

                    var candidates = await _studentRepository.GetAllAsync(q => q
                        .Where(s => s.IsActive && 
                            ((s.ParentGuardianPhone != null && s.ParentGuardianPhone.Trim() != "") || 
                             (s.ParentGuardianEmail != null && s.ParentGuardianEmail.Trim() != ""))));

                    var normalizedParentPhone = NormalizePhoneForMatching(parentPhone);

                    var childStudentIds = candidates
                        .Where(s => 
                            (!string.IsNullOrEmpty(normalizedParentPhone) && PhonesLikelyMatch(normalizedParentPhone, NormalizePhoneForMatching(s.ParentGuardianPhone))) || 
                            (!string.IsNullOrEmpty(parentEmail) && s.ParentGuardianEmail?.Trim().ToLower() == parentEmail))
                        .Select(s => s.Id)
                        .ToList();

                    if (childStudentIds.Any())
                    {
                        regs = await _registrationRepository.GetAllAsync(q => q
                            .Include(r => r.Event)
                            .Where(r => childStudentIds.Contains(r.StudentId))
                            .OrderByDescending(r => r.CreatedAt));
                    }
                    else
                    {
                        regs = new List<EventRegistration>();
                    }
                }
                else
                {
                    regs = new List<EventRegistration>();
                }
            }
            else
            {
                regs = new List<EventRegistration>();
            }
        }
        else
        {
            regs = await _registrationRepository.GetAllAsync(q =>
            {
                IQueryable<EventRegistration> query = q.Include(r => r.Event).Include(r => r.Student);
                if (schoolId.HasValue)
                {
                    query = query.Where(r => r.Event.SchoolId == schoolId.Value || r.Student.SchoolId == schoolId.Value);
                }
                return query.OrderByDescending(r => r.CreatedAt);
            });
        }

        return regs.Select(r => (object)new
        {
            r.Id,
            r.EventId,
            EventName = r.Event?.Title ?? "Unknown Event",
            r.StudentId,
            r.StudentName,
            r.StudentGrade,
            r.StudentSchool,
            r.ParentName,
            r.ParentPhone,
            r.ParentEmail,
            CustomFieldValues = JsonSerializer.Deserialize<Dictionary<string, string>>(r.CustomFieldValuesJson) ?? new Dictionary<string, string>(),
            Attachments = JsonSerializer.Deserialize<List<AttachmentDto>>(r.AttachmentsJson) ?? new List<AttachmentDto>(),
            r.Status,
            r.AttendanceStatus,
            r.EventResult,
            RegistrationDate = r.CreatedAt.ToString("yyyy-MM-dd HH:mm"),
            ApprovalHistory = JsonSerializer.Deserialize<List<HistoryDto>>(r.ApprovalHistoryJson) ?? new List<HistoryDto>()
        }).ToList();
    }

    // Registration statuses that have permanently released their seat / waitlist slot.
    // Rows with these statuses must NOT count toward capacity — they represent a
    // student who is no longer occupying a place in the event (Scenario: cancelled /
    // rejected registrations were previously still counted, causing false "event full"
    // errors even when real seats were available).
    private static readonly string[] ReleasedSeatStatuses = { "Cancelled", "Rejected" };

    public async Task<object> RegisterForEventAsync(Guid eventId, SubmitRegistrationDto dto)
    {
        var events = await _eventRepository.GetAllAsync(q => q
            .Include(e => e.Registrations)
            .Where(e => e.Id == eventId));
        var ev = events.FirstOrDefault();

        if (ev == null) throw new AppException("Event not found.");

        // --- Duplicate-registration guard -------------------------------------------
        // A student could previously submit the registration form repeatedly (e.g. on
        // transient errors) and each submission created a brand-new EventRegistration
        // row, silently inflating the headcount and eventually tripping the capacity
        // check for everyone else. Block re-registration unless their prior attempt was
        // cancelled or rejected (in which case trying again is legitimate).
        var existingActiveRegistration = ev.Registrations.FirstOrDefault(r =>
            r.StudentId == dto.StudentId && !ReleasedSeatStatuses.Contains(r.Status));
        if (existingActiveRegistration != null)
        {
            throw new AppException($"You are already registered for this event (current status: {existingActiveRegistration.Status}).");
        }

        // --- Capacity / waitlist calculation -----------------------------------------
        // Only registrations that are still actively holding a seat or a waitlist slot
        // should count. Cancelled/rejected registrations have released their place and
        // must be excluded, otherwise the event can appear "full" forever even when
        // students cancel and free up real seats.
        var liveRegistrations = ev.Registrations.Where(r => !ReleasedSeatStatuses.Contains(r.Status)).ToList();
        var confirmedCount = liveRegistrations.Count(r => r.Status != "Waitlisted");
        var waitlistCount = liveRegistrations.Count(r => r.Status == "Waitlisted");
        var remainingSeats = Math.Max(0, ev.MaxParticipants - confirmedCount);
        var remainingWaitlistSlots = Math.Max(0, ev.WaitlistLimit - waitlistCount);

        var isWaitlisted = confirmedCount >= ev.MaxParticipants;

        Console.WriteLine(
            $"\n[EVENT REGISTRATION] EventId={ev.Id} StudentId={dto.StudentId} " +
            $"Capacity={ev.MaxParticipants} ConfirmedCount={confirmedCount} RemainingSeats={remainingSeats} " +
            $"WaitlistLimit={ev.WaitlistLimit} WaitlistCount={waitlistCount} RemainingWaitlistSlots={remainingWaitlistSlots} " +
            $"AutoApproval={ev.AutoApproval} WillBeWaitlisted={isWaitlisted}");

        if (isWaitlisted && waitlistCount >= ev.WaitlistLimit)
        {
            throw new AppException("Event registration slot capacities and waitlist is completely full.");
        }

        string finalStatus = "Pending";
        var history = new List<HistoryDto>();

        if (isWaitlisted)
        {
            finalStatus = "Waitlisted";
            history.Add(new HistoryDto { User = "System Bot", Role = "System", Date = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"), Action = "Automatically placed on waitlist due to capacity" });
        }
        else if (ev.AutoApproval)
        {
            finalStatus = "Approved";
            history.Add(new HistoryDto { User = "System Bot", Role = "System", Date = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"), Action = "Auto-approved due to event rules" });
        }

        var reg = new EventRegistration
        {
            Id = Guid.NewGuid(),
            EventId = eventId,
            StudentId = dto.StudentId,
            StudentName = dto.StudentName,
            StudentGrade = dto.StudentGrade,
            StudentSchool = dto.StudentSchool,
            ParentName = dto.ParentName,
            ParentPhone = dto.ParentPhone,
            ParentEmail = dto.ParentEmail,
            CustomFieldValuesJson = JsonSerializer.Serialize(dto.CustomFieldValues ?? new Dictionary<string, string>()),
            AttachmentsJson = JsonSerializer.Serialize(dto.Attachments ?? new List<AttachmentDto>()),
            Status = finalStatus,
            AttendanceStatus = "TBD",
            ApprovalHistoryJson = JsonSerializer.Serialize(history),
            CreatedAt = DateTime.UtcNow
        };

        await _registrationRepository.AddAsync(reg);

        Console.WriteLine(
            $"[EVENT REGISTRATION] Saved RegistrationId={reg.Id} EventId={ev.Id} StudentId={dto.StudentId} " +
            $"FinalStatus={finalStatus} RemainingSeatsAfter={Math.Max(0, remainingSeats - (finalStatus == "Waitlisted" ? 0 : 1))} " +
            $"RemainingWaitlistSlotsAfter={Math.Max(0, remainingWaitlistSlots - (finalStatus == "Waitlisted" ? 1 : 0))}\n");

        await LogAuditEventAsync(ev.SchoolId, $"Registered student {reg.StudentName} for event \"{ev.Title}\". Status: {finalStatus}");

        // Confirm the registration to the student so their dashboard / calendar / bell
        // reflect it immediately (per the Student Registration Workflow requirements).
        var registrant = await _studentRepository.GetByIdAsync(dto.StudentId);
        if (registrant?.UserId != null)
        {
            await NotifyUserAsync(
                registrant.UserId.Value,
                $"Your registration for \"{ev.Title}\" was received. Current status: {finalStatus}.",
                $"/events/{ev.Id}/registrations/{reg.Id}");
        }

        return new { message = "Registration successful.", registrationId = reg.Id, status = finalStatus };
    }

    public async Task<object> UpdateRegistrationStatusAsync(Guid regId, UpdateStatusDto dto)
    {
        var regs = await _registrationRepository.GetAllAsync(q => q
            .Include(r => r.Event)
            .Where(r => r.Id == regId));
        var reg = regs.FirstOrDefault();

        if (reg == null) throw new AppException("Registration not found.");

        reg.Status = dto.Status;
        
        var history = JsonSerializer.Deserialize<List<HistoryDto>>(reg.ApprovalHistoryJson) ?? new List<HistoryDto>();
        var userVal = _currentUserService.User?.Identity?.Name 
            ?? _currentUserService.User?.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value 
            ?? "Staff User";

        history.Add(new HistoryDto
        {
            User = userVal,
            Role = _currentUserService.Role ?? "Staff",
            Date = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"),
            Action = $"Changed status to {dto.Status}"
        });
        reg.ApprovalHistoryJson = JsonSerializer.Serialize(history);

        await _registrationRepository.UpdateAsync(reg);
        await LogAuditEventAsync(reg.Event.SchoolId, $"Updated registration status of student {reg.StudentName} to {dto.Status}");

        // Let the student know their approval/waitlist/rejection status changed.
        var statusRegistrant = await _studentRepository.GetByIdAsync(reg.StudentId);
        if (statusRegistrant?.UserId != null)
        {
            await NotifyUserAsync(
                statusRegistrant.UserId.Value,
                $"Your registration for \"{reg.Event.Title}\" is now \"{dto.Status}\".",
                $"/events/{reg.EventId}/registrations/{reg.Id}");
        }

        return reg;
    }

    public async Task<object> UpdateRegistrationAttendanceAsync(Guid regId, UpdateAttendanceDto dto)
    {
        var regs = await _registrationRepository.GetAllAsync(q => q
            .Include(r => r.Event)
            .Where(r => r.Id == regId));
        var reg = regs.FirstOrDefault();

        if (reg == null) throw new AppException("Registration not found.");

        reg.AttendanceStatus = dto.AttendanceStatus;
        await _registrationRepository.UpdateAsync(reg);

        await LogAuditEventAsync(reg.Event.SchoolId, $"Updated attendance status of student {reg.StudentName} to {dto.AttendanceStatus}");

        return reg;
    }

    public async Task<object> LogEventResultAsync(Guid regId, LogResultDto dto)
    {
        var regs = await _registrationRepository.GetAllAsync(q => q
            .Include(r => r.Event)
            .Where(r => r.Id == regId));
        var reg = regs.FirstOrDefault();

        if (reg == null) throw new AppException("Registration not found.");

        reg.EventResult = dto.Result;
        if (!string.IsNullOrEmpty(dto.Result))
        {
            reg.Status = "Completed";
        }
        await _registrationRepository.UpdateAsync(reg);

        await LogAuditEventAsync(reg.Event.SchoolId, $"Logged result \"{dto.Result}\" for student {reg.StudentName}");

        return reg;
    }

    public async Task CancelRegistrationAsync(Guid regId)
    {
        var regs = await _registrationRepository.GetAllAsync(q => q
            .Include(r => r.Event)
            .Where(r => r.Id == regId));
        var reg = regs.FirstOrDefault();

        if (reg == null) throw new AppException("Registration not found.");

        var today = DateTime.UtcNow;
        if (today > reg.Event.Deadline)
        {
            throw new AppException("Registration cannot be cancelled after the contest deadline.");
        }

        reg.Status = "Cancelled";
        await _registrationRepository.UpdateAsync(reg);

        await LogAuditEventAsync(reg.Event.SchoolId, $"Student {reg.StudentName} cancelled registration for event \"{reg.Event.Title}\"");
    }

    public async Task<object> UpdateRegistrationAsync(Guid regId, SubmitRegistrationDto dto)
    {
        var regs = await _registrationRepository.GetAllAsync(q => q
            .Include(r => r.Event)
            .Where(r => r.Id == regId));
        var reg = regs.FirstOrDefault();

        if (reg == null) throw new AppException("Registration not found.");

        var today = DateTime.UtcNow;
        if (today > reg.Event.Deadline)
        {
            throw new AppException("Registration cannot be updated after the contest deadline.");
        }

        reg.ParentName = dto.ParentName;
        reg.ParentPhone = dto.ParentPhone;
        reg.ParentEmail = dto.ParentEmail;
        reg.CustomFieldValuesJson = JsonSerializer.Serialize(dto.CustomFieldValues ?? new Dictionary<string, string>());
        reg.AttachmentsJson = JsonSerializer.Serialize(dto.Attachments ?? new List<AttachmentDto>());

        await _registrationRepository.UpdateAsync(reg);
        await LogAuditEventAsync(reg.Event.SchoolId, $"Student {reg.StudentName} updated registration for event \"{reg.Event.Title}\"");

        return new { message = "Registration updated successfully." };
    }

    public async Task<List<EventAuditLog>> GetAuditLogsAsync()
    {
        return await _auditLogRepository.GetAllAsync(q => q.OrderByDescending(l => l.DateTime));
    }

    private static string NormalizePhoneForMatching(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return string.Empty;
        var digitsOnly = new string(phone.Where(char.IsDigit).ToArray());
        return digitsOnly;
    }

    private static bool PhonesLikelyMatch(string normalizedA, string normalizedB)
    {
        if (string.IsNullOrEmpty(normalizedA) || string.IsNullOrEmpty(normalizedB)) return false;

        // Exact match after stripping formatting — the common case.
        if (normalizedA == normalizedB) return true;

        const int coreLength = 9; // typical local-subscriber-number length, excluding trunk/country code
        if (normalizedA.Length < coreLength || normalizedB.Length < coreLength) return false;

        var coreA = normalizedA[^coreLength..];
        var coreB = normalizedB[^coreLength..];
        return coreA == coreB;
    }
}
