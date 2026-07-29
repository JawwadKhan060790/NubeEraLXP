using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Services.Event;
using NubeEra.Domain.Entities;

namespace NubeEra.API.Controllers.Event;

[ApiController]
[Route("api/events")]
[Authorize]
public class EventsController : ControllerBase
{
    private readonly IEventService _eventService;

    public EventsController(IEventService eventService)
    {
        _eventService = eventService;
    }

    // ── Read (all authenticated roles) ───────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetEvents()
    {
        var result = await _eventService.GetEventsAsync();
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetEventById(Guid id)
    {
        var result = await _eventService.GetEventByIdAsync(id);
        if (result == null) return NotFound(new { error = "Event not found." });
        return Ok(result);
    }

    // ── Mutation (Teacher/Staff/Principal/Admin only) ─────────────────────────

    [HttpPost]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> CreateEvent([FromBody] CreateEventDto dto)
    {
        var ev = await _eventService.CreateEventAsync(dto);
        return Ok(ev);
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> UpdateEvent(Guid id, [FromBody] CreateEventDto dto)
    {
        var ev = await _eventService.UpdateEventAsync(id, dto);
        return Ok(ev);
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "PrincipalOnly")]
    public async Task<IActionResult> DeleteEvent(Guid id)
    {
        await _eventService.DeleteEventAsync(id);
        return Ok(new { message = "Event deleted successfully." });
    }

    // ── Registrations ─────────────────────────────────────────────────────────

    [HttpGet("registrations")]
    [Authorize]
    public async Task<IActionResult> GetRegistrations()
    {
        var result = await _eventService.GetRegistrationsAsync();
        return Ok(result);
    }

    /// <summary>Any authenticated user (including Student/Parent) may register for an event.</summary>
    [HttpPost("{eventId}/register")]
    public async Task<IActionResult> RegisterForEvent(Guid eventId, [FromBody] SubmitRegistrationDto dto)
    {
        var result = await _eventService.RegisterForEventAsync(eventId, dto);
        return Ok(result);
    }

    [HttpPut("registrations/{regId}/status")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> UpdateRegistrationStatus(Guid regId, [FromBody] UpdateStatusDto dto)
    {
        var result = await _eventService.UpdateRegistrationStatusAsync(regId, dto);
        return Ok(result);
    }

    [HttpPut("registrations/{regId}/attendance")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> UpdateRegistrationAttendance(Guid regId, [FromBody] UpdateAttendanceDto dto)
    {
        var result = await _eventService.UpdateRegistrationAttendanceAsync(regId, dto);
        return Ok(result);
    }

    [HttpPut("registrations/{regId}/result")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> LogEventResult(Guid regId, [FromBody] LogResultDto dto)
    {
        var result = await _eventService.LogEventResultAsync(regId, dto);
        return Ok(result);
    }

    /// <summary>Any authenticated user may cancel their own registration.</summary>
    [HttpPost("registrations/{regId}/cancel")]
    public async Task<IActionResult> CancelRegistration(Guid regId)
    {
        await _eventService.CancelRegistrationAsync(regId);
        return Ok(new { message = "Registration cancelled successfully." });
    }

    /// <summary>Any authenticated user may update their own registration.</summary>
    [HttpPut("registrations/{regId}")]
    public async Task<IActionResult> UpdateRegistration(Guid regId, [FromBody] SubmitRegistrationDto dto)
    {
        var result = await _eventService.UpdateRegistrationAsync(regId, dto);
        return Ok(result);
    }

    [HttpGet("audit-logs")]
    [Authorize(Policy = "PrincipalOnly")]
    public async Task<IActionResult> GetAuditLogs()
    {
        var logs = await _eventService.GetAuditLogsAsync();
        return Ok(logs);
    }
}
