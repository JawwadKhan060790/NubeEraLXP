using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using NubeEra.Application.DTOs;
using NubeEra.Domain.Entities;

namespace NubeEra.Application.Interfaces.Services.SupportTicket;

public interface ITicketService
{
    Task<List<object>> GetCategoriesAsync();
    Task<TicketCategory> CreateCategoryAsync(CreateCategoryDto dto);
    Task DeleteCategoryAsync(Guid id);
    
    Task<object> GetTicketsAsync(
        TicketStatus? status,
        TicketPriority? priority,
        Guid? categoryId,
        string? search,
        int page,
        int pageSize);

    Task<object> CreateTicketAsync(CreateTicketDto dto);
    Task<object> GetTicketDetailAsync(Guid id);
    Task<object> PostCommentAsync(Guid id, CreateCommentDto dto);
    Task AssignTicketAsync(Guid id, AssignTicketDto dto);
    Task UpdateStatusAsync(Guid id, UpdateTicketStatusDto dto);
    Task<object> GetAnalyticsAsync();
    
    Task<List<object>> GetNotificationsAsync();
    Task MarkNotificationReadAsync(Guid id);
}
