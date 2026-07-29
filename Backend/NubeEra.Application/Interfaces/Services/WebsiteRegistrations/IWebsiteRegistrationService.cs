using System;
using System.Threading.Tasks;
using NubeEra.Application.DTOs;
using NubeEra.Domain.Entities;

namespace NubeEra.Application.Interfaces.Services.WebsiteRegistrations;

public interface IWebsiteRegistrationService
{
    Task<object> SubmitRegistrationAsync(WebsiteRegistration registration);
    Task<object> GetAllAsync(string? search, string? status, string? program, int page, int pageSize);
    Task<WebsiteRegistration?> GetByIdAsync(Guid id);
    Task<WebsiteRegistration> UpdateRegistrationAsync(Guid id, WebsiteRegistration updated);
    Task ConvertToStudentAsync(Guid id, ConvertRegistrationDto dto);
}
