using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Services.SupportTicket;
using NubeEra.Domain.Entities;

namespace NubeEra.API.Controllers.SupportTicket;

[ApiController]
[Route("api/support")]
[Authorize]
public class TicketsController : ControllerBase
{
    private readonly ITicketService _ticketService;

    public TicketsController(ITicketService ticketService)
    {
        _ticketService = ticketService;
    }

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        var result = await _ticketService.GetCategoriesAsync();
        return Ok(result);
    }

    [HttpPost("categories")]
    [Authorize(Policy = "StaffOnly")]
    public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryDto dto)
    {
        var category = await _ticketService.CreateCategoryAsync(dto);
        return Ok(category);
    }

    [HttpDelete("categories/{id}")]
    [Authorize(Policy = "StaffOnly")]
    public async Task<IActionResult> DeleteCategory(Guid id)
    {
        await _ticketService.DeleteCategoryAsync(id);
        return Ok(new { message = "Category deleted successfully." });
    }

    [HttpGet("tickets")]
    public async Task<IActionResult> GetTickets(
        [FromQuery] TicketStatus? status,
        [FromQuery] TicketPriority? priority,
        [FromQuery] Guid? categoryId,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _ticketService.GetTicketsAsync(status, priority, categoryId, search, page, pageSize);
        return Ok(result);
    }

    [HttpPost("tickets")]
    public async Task<IActionResult> CreateTicket([FromBody] CreateTicketDto dto)
    {
        var result = await _ticketService.CreateTicketAsync(dto);
        return Ok(result);
    }

    [HttpGet("tickets/{id}")]
    public async Task<IActionResult> GetTicketDetail(Guid id)
    {
        var result = await _ticketService.GetTicketDetailAsync(id);
        return Ok(result);
    }

    [HttpPost("tickets/{id}/reply")]
    public async Task<IActionResult> PostComment(Guid id, [FromBody] CreateCommentDto dto)
    {
        var result = await _ticketService.PostCommentAsync(id, dto);
        return Ok(result);
    }

    [HttpPut("tickets/{id}/assign")]
    [Authorize(Policy = "StaffOnly")]
    public async Task<IActionResult> AssignTicket(Guid id, [FromBody] AssignTicketDto dto)
    {
        await _ticketService.AssignTicketAsync(id, dto);
        return Ok(new { message = "Ticket assigned successfully." });
    }

    [HttpPut("tickets/{id}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateTicketStatusDto dto)
    {
        await _ticketService.UpdateStatusAsync(id, dto);
        return Ok(new { message = "Ticket status updated successfully." });
    }

    [HttpGet("analytics")]
    [Authorize(Policy = "StaffOnly")]
    public async Task<IActionResult> GetAnalytics()
    {
        var result = await _ticketService.GetAnalyticsAsync();
        return Ok(result);
    }

    [HttpGet("notifications")]
    public async Task<IActionResult> GetNotifications()
    {
        var result = await _ticketService.GetNotificationsAsync();
        return Ok(result);
    }

    [HttpPut("notifications/{id}/read")]
    public async Task<IActionResult> MarkNotificationRead(Guid id)
    {
        await _ticketService.MarkNotificationReadAsync(id);
        return Ok(new { message = "Notification marked as read." });
    }
}
