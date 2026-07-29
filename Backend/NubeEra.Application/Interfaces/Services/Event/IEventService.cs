using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using NubeEra.Application.DTOs;
using NubeEra.Domain.Entities;

namespace NubeEra.Application.Interfaces.Services.Event;

public interface IEventService
{
    Task<List<object>> GetEventsAsync();
    Task<object?> GetEventByIdAsync(Guid id);
    Task<NubeEra.Domain.Entities.Event> CreateEventAsync(CreateEventDto dto);
    Task<NubeEra.Domain.Entities.Event> UpdateEventAsync(Guid id, CreateEventDto dto);
    Task DeleteEventAsync(Guid id);
    
    Task<List<object>> GetRegistrationsAsync();
    Task<object> RegisterForEventAsync(Guid eventId, SubmitRegistrationDto dto);
    Task<object> UpdateRegistrationStatusAsync(Guid regId, UpdateStatusDto dto);
    Task<object> UpdateRegistrationAttendanceAsync(Guid regId, UpdateAttendanceDto dto);
    Task<object> LogEventResultAsync(Guid regId, LogResultDto dto);
    Task CancelRegistrationAsync(Guid regId);
    Task<object> UpdateRegistrationAsync(Guid regId, SubmitRegistrationDto dto);
    
    Task<List<EventAuditLog>> GetAuditLogsAsync();
}
