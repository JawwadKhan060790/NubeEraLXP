using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Repositories;
using NubeEra.Application.Interfaces.Services.SupportTicket;
using NubeEra.Application.Interfaces.Security;
using NubeEra.Domain.Entities;
using NubeEra.Domain.Common;

namespace NubeEra.Application.Services.SupportTicket;

public class TicketService : ITicketService
{
    private readonly IGenericRepository<TicketCategory> _categoryRepository;
    private readonly IGenericRepository<Ticket> _ticketRepository;
    private readonly IGenericRepository<TicketAttachment> _attachmentRepository;
    private readonly IGenericRepository<TicketComment> _commentRepository;
    private readonly IGenericRepository<TicketHistory> _historyRepository;
    private readonly IGenericRepository<InAppNotification> _notificationRepository;
    private readonly IGenericRepository<User> _userRepository;
    private readonly IGenericRepository<Student> _studentRepository;
    private readonly IGenericRepository<Teacher> _teacherRepository;
    private readonly IGenericRepository<School> _schoolRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly ITenantService       _tenantService;

    public TicketService(
        IGenericRepository<TicketCategory> categoryRepository,
        IGenericRepository<Ticket> ticketRepository,
        IGenericRepository<TicketAttachment> attachmentRepository,
        IGenericRepository<TicketComment> commentRepository,
        IGenericRepository<TicketHistory> historyRepository,
        IGenericRepository<InAppNotification> notificationRepository,
        IGenericRepository<User> userRepository,
        IGenericRepository<Student> studentRepository,
        IGenericRepository<Teacher> teacherRepository,
        IGenericRepository<School> schoolRepository,
        ICurrentUserService currentUserService,
        
        ITenantService tenantService)
    {
        _categoryRepository = categoryRepository;
        _ticketRepository = ticketRepository;
        _attachmentRepository = attachmentRepository;
        _commentRepository = commentRepository;
        _historyRepository = historyRepository;
        _notificationRepository = notificationRepository;
        _userRepository = userRepository;
        _studentRepository = studentRepository;
        _teacherRepository = teacherRepository;
        _schoolRepository = schoolRepository;
        _currentUserService = currentUserService;
        _tenantService       = tenantService;
    }

    private Guid GetCurrentUserId()
    {
        var userIdStr = _currentUserService.UserId;
        if (string.IsNullOrEmpty(userIdStr)) throw new UnauthorizedAccessException("User not logged in.");
        return Guid.Parse(userIdStr);
    }

    private async Task<Guid> GetSchoolIdAsync()
    {
        var schoolId = _tenantService.GetEffectiveSchoolId();
        if (schoolId.HasValue) return schoolId.Value;

        var userIdStr = _currentUserService.UserId;
        if (Guid.TryParse(userIdStr, out var userId))
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user != null && user.SchoolId.HasValue) return user.SchoolId.Value;

            if (user != null && user.IsParent)
            {
                var phone = user.Phone?.Trim();
                var email = user.Email?.Trim().ToLower();
                var linkedStudent = (await _studentRepository.GetAllAsync(q => q.Where(s =>
                    (!string.IsNullOrEmpty(phone) && s.ParentGuardianPhone == phone) ||
                    (!string.IsNullOrEmpty(email) && s.ParentGuardianEmail == email)
                ))).FirstOrDefault();
                if (linkedStudent != null) return linkedStudent.SchoolId;
            }

            var students = await _studentRepository.GetAllAsync(q => q.Where(s => s.UserId == userId));
            var student = students.FirstOrDefault();
            if (student != null) return student.SchoolId;

            var teachers = await _teacherRepository.GetAllAsync(q => q.Where(t => t.UserId == userId));
            var teacher = teachers.FirstOrDefault();
            if (teacher != null) return teacher.SchoolId;
        }

        var schools = await _schoolRepository.GetAllAsync();
        var firstSchool = schools.FirstOrDefault();
        if (firstSchool != null) return firstSchool.Id;

        throw new AppException("User is not associated with any school.");
    }

    private bool IsStaffOrAdmin()
    {
        var role = _currentUserService.Role?.ToLowerInvariant();
        return role == "admin" || role == "superadmin" || role == "staff" || role == "principal";
    }

    public async Task<List<object>> GetCategoriesAsync()
    {
        var categories = await _categoryRepository.GetAllAsync(q => q
            .Where(c => c.IsActive)
            .OrderBy(c => c.Name));

        return categories.Select(c => (object)new { c.Id, c.Name, c.Description }).ToList();
    }

    public async Task<TicketCategory> CreateCategoryAsync(CreateCategoryDto dto)
    {
        if (!IsStaffOrAdmin()) throw new UnauthorizedAccessException("Access denied.");
        var schoolId = await GetSchoolIdAsync();

        var category = new TicketCategory
        {
            Id = Guid.NewGuid(),
            SchoolId = schoolId,
            Name = dto.Name,
            Description = dto.Description,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _categoryRepository.AddAsync(category);
        return category;
    }

    public async Task DeleteCategoryAsync(Guid id)
    {
        if (!IsStaffOrAdmin()) throw new UnauthorizedAccessException("Access denied.");

        var category = await _categoryRepository.GetByIdAsync(id);
        if (category == null) throw new AppException("Category not found.");

        await _categoryRepository.DeleteAsync(category);
    }

    public async Task<object> GetTicketsAsync(
        TicketStatus? status,
        TicketPriority? priority,
        Guid? categoryId,
        string? search,
        int page,
        int pageSize)
    {
        var tickets = await _ticketRepository.GetAllAsync(q =>
        {
            var query = q.Include(t => t.Category)
                         .Include(t => t.RequesterUser)
                         .Include(t => t.AssignedToUser)
                         .AsQueryable();

            if (status.HasValue) query = query.Where(t => t.Status == status.Value);
            if (priority.HasValue) query = query.Where(t => t.Priority == priority.Value);
            if (categoryId.HasValue) query = query.Where(t => t.CategoryId == categoryId.Value);

            if (!string.IsNullOrEmpty(search))
            {
                var s = search.ToLower();
                query = query.Where(t => t.Subject.ToLower().Contains(s) || 
                                         t.TicketNumber.ToLower().Contains(s) || 
                                         t.Description.ToLower().Contains(s));
            }

            return query.OrderByDescending(t => t.CreatedAt);
        });

        var totalItems = tickets.Count;
        var pagedItems = tickets
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new
            {
                t.Id,
                t.TicketNumber,
                t.Subject,
                t.Description,
                Status = t.Status.ToString(),
                Priority = t.Priority.ToString(),
                t.CreatedAt,
                t.ResolvedAt,
                Category = t.Category != null 
                    ? new { Id = (Guid?)t.Category.Id, Name = t.Category.Name } 
                    : new { Id = (Guid?)Guid.Empty, Name = "Unassigned" },
                Requester = t.RequesterUser != null 
                    ? new { Id = (Guid?)t.RequesterUser.Id, FirstName = t.RequesterUser.FirstName, LastName = t.RequesterUser.LastName, Email = t.RequesterUser.Email } 
                    : new { Id = (Guid?)Guid.Empty, FirstName = "Deleted", LastName = "User", Email = "" },
                AssignedTo = t.AssignedToUser != null ? new { t.AssignedToUser.Id, t.AssignedToUser.FirstName, t.AssignedToUser.LastName } : null
            })
            .ToList();

        return new { totalItems, page, pageSize, items = pagedItems };
    }

    public async Task<object> CreateTicketAsync(CreateTicketDto dto)
    {
        var userId = GetCurrentUserId();
        var schoolId = await GetSchoolIdAsync();

        var school = await _schoolRepository.GetByIdAsync(schoolId);
        if (school == null)
            throw new AppException($"The resolved school does not exist. (Resolved ID: {schoolId})");

        var category = await _categoryRepository.GetByIdAsync(dto.CategoryId);
        if (category == null)
            throw new AppException($"The selected category does not exist in the system. (Selected ID: {dto.CategoryId})");

        var count = await _ticketRepository.CountAsync(q => q.Where(t => t.SchoolId == schoolId));
        var ticketNo = $"TK-{DateTime.UtcNow.Year}-{(count + 1):D4}";

        var ticket = new Ticket
        {
            Id = Guid.NewGuid(),
            SchoolId = schoolId,
            TicketNumber = ticketNo,
            RequesterUserId = userId,
            Subject = dto.Subject,
            Description = dto.Description,
            Priority = dto.Priority,
            Status = TicketStatus.Open,
            CategoryId = dto.CategoryId,
            CreatedAt = DateTime.UtcNow
        };

        await _ticketRepository.AddAsync(ticket);

        // Add attachments
        foreach (var att in dto.Attachments)
        {
            var attachment = new TicketAttachment
            {
                Id = Guid.NewGuid(),
                TicketId = ticket.Id,
                FileName = att.FileName,
                FileUrl = att.FileUrl,
                FileType = att.FileType,
                FileSize = att.FileSize,
                CreatedAt = DateTime.UtcNow
            };
            await _attachmentRepository.AddAsync(attachment);
        }

        // Create initial history
        var history = new TicketHistory
        {
            Id = Guid.NewGuid(),
            TicketId = ticket.Id,
            UserId = userId,
            Action = "Created ticket",
            NewValue = "Status: Open",
            CreatedAt = DateTime.UtcNow
        };
        await _historyRepository.AddAsync(history);

        // Fetch active school staff to notify
        var staffList = await _userRepository.GetAllAsync(q => q
            .Include(u => u.Role)
            .Where(u => u.SchoolId == schoolId && (u.Role.RoleName.ToLower() == "staff" || u.Role.RoleName.ToLower() == "admin")));

        foreach (var staff in staffList)
        {
            await _notificationRepository.AddAsync(new InAppNotification
            {
                Id = Guid.NewGuid(),
                UserId = staff.Id,
                Message = $"New support ticket {ticketNo} raised: '{dto.Subject}'",
                LinkUrl = $"/support/tickets/{ticket.Id}",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });
        }

        return new { message = "Ticket created successfully.", ticketId = ticket.Id, ticketNumber = ticketNo };
    }

    public async Task<object> GetTicketDetailAsync(Guid id)
    {
        var tickets = await _ticketRepository.GetAllAsync(q => q
            .Include(t => t.Category)
            .Include(t => t.RequesterUser)
            .Include(t => t.AssignedToUser)
            .Where(t => t.Id == id));
        var ticket = tickets.FirstOrDefault();

        if (ticket == null) throw new AppException("Ticket not found.");

        var commentsList = await _commentRepository.GetAllAsync(q => q
            .Include(c => c.User)
            .ThenInclude(u => u.Role)
            .Where(c => c.TicketId == id));

        // Exclude internal notes for standard users
        if (!IsStaffOrAdmin())
        {
            commentsList = commentsList.Where(c => !c.IsInternal).ToList();
        }

        var comments = commentsList
            .OrderBy(c => c.CreatedAt)
            .Select(c => new
            {
                c.Id,
                c.Content,
                c.IsInternal,
                c.CreatedAt,
                User = new { c.User.Id, c.User.FirstName, c.User.LastName, Role = c.User.Role?.RoleName ?? "User" }
            })
            .ToList();

        var attachmentsList = await _attachmentRepository.GetAllAsync(q => q.Where(a => a.TicketId == id));
        var attachments = attachmentsList.Select(a => new { a.Id, a.TicketCommentId, a.FileName, a.FileUrl, a.FileType, a.FileSize, a.CreatedAt }).ToList();

        var historyList = await _historyRepository.GetAllAsync(q => q
            .Include(h => h.User)
            .Where(h => h.TicketId == id)
            .OrderByDescending(h => h.CreatedAt));

        var history = historyList.Select(h => new
        {
            h.Id,
            h.Action,
            h.OldValue,
            h.NewValue,
            h.CreatedAt,
            User = new { h.User.Id, h.User.FirstName, h.User.LastName }
        }).ToList();

        return new
        {
            ticket.Id,
            ticket.TicketNumber,
            ticket.Subject,
            ticket.Description,
            Status = ticket.Status.ToString(),
            Priority = ticket.Priority.ToString(),
            ticket.CreatedAt,
            ticket.ResolvedAt,
            Category = ticket.Category != null 
                ? new { Id = (Guid?)ticket.Category.Id, Name = ticket.Category.Name } 
                : new { Id = (Guid?)Guid.Empty, Name = "Unassigned" },
            Requester = ticket.RequesterUser != null 
                ? new { Id = (Guid?)ticket.RequesterUser.Id, FirstName = ticket.RequesterUser.FirstName, LastName = ticket.RequesterUser.LastName, Role = ticket.RequesterUser.Role?.RoleName ?? "User" } 
                : new { Id = (Guid?)Guid.Empty, FirstName = "Deleted", LastName = "User", Role = "User" },
            AssignedTo = ticket.AssignedToUser != null ? new { ticket.AssignedToUser.Id, ticket.AssignedToUser.FirstName, ticket.AssignedToUser.LastName } : null,
            comments,
            attachments,
            history
        };
    }

    public async Task<object> PostCommentAsync(Guid id, CreateCommentDto dto)
    {
        var userId = GetCurrentUserId();
        var ticket = await _ticketRepository.GetByIdAsync(id);
        if (ticket == null) throw new AppException("Ticket not found.");

        var isStaff = IsStaffOrAdmin();
        var commentIsInternal = dto.IsInternal && isStaff;

        var comment = new TicketComment
        {
            Id = Guid.NewGuid(),
            TicketId = id,
            UserId = userId,
            Content = dto.Content,
            IsInternal = commentIsInternal,
            CreatedAt = DateTime.UtcNow
        };

        await _commentRepository.AddAsync(comment);

        // Add comment attachments
        foreach (var att in dto.Attachments)
        {
            var attachment = new TicketAttachment
            {
                Id = Guid.NewGuid(),
                TicketId = id,
                TicketCommentId = comment.Id,
                FileName = att.FileName,
                FileUrl = att.FileUrl,
                FileType = att.FileType,
                FileSize = att.FileSize,
                CreatedAt = DateTime.UtcNow
            };
            await _attachmentRepository.AddAsync(attachment);
        }

        // Create history
        var history = new TicketHistory
        {
            Id = Guid.NewGuid(),
            TicketId = id,
            UserId = userId,
            Action = commentIsInternal ? "Added internal note" : "Posted public reply",
            CreatedAt = DateTime.UtcNow
        };
        await _historyRepository.AddAsync(history);

        // Trigger In-App Notifications
        if (!commentIsInternal)
        {
            if (userId == ticket.RequesterUserId)
            {
                if (ticket.AssignedToUserId.HasValue)
                {
                    await _notificationRepository.AddAsync(new InAppNotification
                    {
                        Id = Guid.NewGuid(),
                        UserId = ticket.AssignedToUserId.Value,
                        Message = $"Requester replied on ticket {ticket.TicketNumber}",
                        LinkUrl = $"/support/tickets/{ticket.Id}",
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }
            else
            {
                await _notificationRepository.AddAsync(new InAppNotification
                {
                    Id = Guid.NewGuid(),
                    UserId = ticket.RequesterUserId,
                    Message = $"New staff reply received on support ticket {ticket.TicketNumber}",
                    LinkUrl = $"/support/tickets/{ticket.Id}",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        return new { message = "Reply posted successfully.", commentId = comment.Id };
    }

    public async Task AssignTicketAsync(Guid id, AssignTicketDto dto)
    {
        if (!IsStaffOrAdmin()) throw new UnauthorizedAccessException("Access denied.");

        var ticket = await _ticketRepository.GetByIdAsync(id);
        if (ticket == null) throw new AppException("Ticket not found.");

        var assignee = await _userRepository.GetByIdAsync(dto.AssignedToUserId);
        if (assignee == null) throw new AppException("Assignee user not found.");

        var oldAssigneeId = ticket.AssignedToUserId;
        ticket.AssignedToUserId = dto.AssignedToUserId;
        
        if (ticket.Status == TicketStatus.Open)
        {
            ticket.Status = TicketStatus.InProgress;
        }

        // Create history
        var history = new TicketHistory
        {
            Id = Guid.NewGuid(),
            TicketId = id,
            UserId = GetCurrentUserId(),
            Action = "Assigned ticket",
            OldValue = oldAssigneeId?.ToString() ?? "None",
            NewValue = $"{assignee.FirstName} {assignee.LastName}",
            CreatedAt = DateTime.UtcNow
        };
        await _historyRepository.AddAsync(history);

        // Notify Assignee
        await _notificationRepository.AddAsync(new InAppNotification
        {
            Id = Guid.NewGuid(),
            UserId = dto.AssignedToUserId,
            Message = $"Support ticket {ticket.TicketNumber} has been assigned to you.",
            LinkUrl = $"/support/tickets/{ticket.Id}",
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        });

        await _ticketRepository.UpdateAsync(ticket);
    }

    public async Task UpdateStatusAsync(Guid id, UpdateTicketStatusDto dto)
    {
        var ticket = await _ticketRepository.GetByIdAsync(id);
        if (ticket == null) throw new AppException("Ticket not found.");

        var userId = GetCurrentUserId();

        if (!IsStaffOrAdmin() && userId != ticket.RequesterUserId)
        {
            throw new UnauthorizedAccessException("Access denied.");
        }

        var oldStatus = ticket.Status;
        ticket.Status = dto.Status;

        if (dto.Status == TicketStatus.Resolved || dto.Status == TicketStatus.Closed)
        {
            ticket.ResolvedAt = DateTime.UtcNow;
        }
        else
        {
            ticket.ResolvedAt = null;
        }

        // Create history
        var history = new TicketHistory
        {
            Id = Guid.NewGuid(),
            TicketId = id,
            UserId = userId,
            Action = "Updated status",
            OldValue = oldStatus.ToString(),
            NewValue = dto.Status.ToString(),
            CreatedAt = DateTime.UtcNow
        };
        await _historyRepository.AddAsync(history);

        // Trigger Notifications
        if (userId != ticket.RequesterUserId)
        {
            await _notificationRepository.AddAsync(new InAppNotification
            {
                Id = Guid.NewGuid(),
                UserId = ticket.RequesterUserId,
                Message = $"Support ticket {ticket.TicketNumber} status updated to: {dto.Status}",
                LinkUrl = $"/support/tickets/{ticket.Id}",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });
        }
        else if (ticket.AssignedToUserId.HasValue)
        {
            await _notificationRepository.AddAsync(new InAppNotification
            {
                Id = Guid.NewGuid(),
                UserId = ticket.AssignedToUserId.Value,
                Message = $"Requester updated support ticket {ticket.TicketNumber} status to: {dto.Status}",
                LinkUrl = $"/support/tickets/{ticket.Id}",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });
        }

        await _ticketRepository.UpdateAsync(ticket);
    }

    public async Task<object> GetAnalyticsAsync()
    {
        if (!IsStaffOrAdmin()) throw new UnauthorizedAccessException("Access denied.");

        var totalTickets = await _ticketRepository.CountAsync();
        
        var tickets = await _ticketRepository.GetAllAsync(q => q.Include(t => t.Category).Include(t => t.AssignedToUser));
        
        var statusCounts = tickets
            .GroupBy(t => t.Status)
            .Select(g => new { Status = g.Key.ToString(), Count = g.Count() })
            .ToList();

        var categoryCounts = tickets
            .GroupBy(t => t.Category?.Name ?? "Unassigned")
            .Select(g => new { Category = g.Key, Count = g.Count() })
            .ToList();

        var priorityCounts = tickets
            .GroupBy(t => t.Priority)
            .Select(g => new { Priority = g.Key.ToString(), Count = g.Count() })
            .ToList();

        // Calculate Average Resolution Time in Hours
        var resolvedTickets = tickets.Where(t => t.ResolvedAt.HasValue).ToList();

        double avgResolutionHours = 0;
        if (resolvedTickets.Any())
        {
            var totalHours = resolvedTickets.Sum(t => (t.ResolvedAt!.Value - t.CreatedAt).TotalHours);
            avgResolutionHours = Math.Round(totalHours / resolvedTickets.Count, 1);
        }

        // Staff Performance Leaderboard
        var leaderboard = tickets
            .Where(t => t.AssignedToUserId.HasValue && t.Status == TicketStatus.Resolved)
            .GroupBy(t => new { t.AssignedToUser!.FirstName, t.AssignedToUser.LastName })
            .Select(g => new
            {
                Name = $"{g.Key.FirstName} {g.Key.LastName}",
                ResolvedCount = g.Count()
            })
            .OrderByDescending(g => g.ResolvedCount)
            .Take(5)
            .ToList();

        return new
        {
            totalTickets,
            statusCounts,
            categoryCounts,
            priorityCounts,
            avgResolutionHours,
            leaderboard
        };
    }

    public async Task<List<object>> GetNotificationsAsync()
    {
        var userId = GetCurrentUserId();
        var notifications = await _notificationRepository.GetAllAsync(q => q
            .Where(n => n.UserId == userId && !n.IsRead)
            .OrderByDescending(n => n.CreatedAt));

        return notifications.Select(n => (object)new { n.Id, n.Message, n.LinkUrl, n.CreatedAt }).ToList();
    }

    public async Task MarkNotificationReadAsync(Guid id)
    {
        var userId = GetCurrentUserId();
        var notification = await _notificationRepository.GetByIdAsync(id);
        if (notification == null || notification.UserId != userId) throw new AppException("Notification not found.");

        notification.IsRead = true;
        await _notificationRepository.UpdateAsync(notification);
    }
}
