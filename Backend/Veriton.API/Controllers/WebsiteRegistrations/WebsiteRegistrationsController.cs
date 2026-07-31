using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using Veriton.Application.DTOs;
using Veriton.Application.Interfaces.Services.WebsiteRegistrations;
using Veriton.Domain.Entities;

namespace Veriton.API.Controllers.WebsiteRegistrations;

[ApiController]
[Route("api/website-registrations")]
[Authorize]
public class WebsiteRegistrationsController : ControllerBase
{
    private readonly IWebsiteRegistrationService _registrationService;

    public WebsiteRegistrationsController(IWebsiteRegistrationService registrationService)
    {
        _registrationService = registrationService;
    }

    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> SubmitRegistration([FromBody] WebsiteRegistration registration)
    {
        var result = await _registrationService.SubmitRegistrationAsync(registration);
        return Ok(result);
    }

    [HttpGet]
    [Authorize(Policy = "StaffOnly")]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] string? program,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _registrationService.GetAllAsync(search, status, program, page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id}")]
    [Authorize(Policy = "StaffOnly")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var registration = await _registrationService.GetByIdAsync(id);
        if (registration == null)
            return NotFound(new { message = "Registration lead not found." });

        return Ok(registration);
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "StaffOnly")]
    public async Task<IActionResult> UpdateRegistration(Guid id, [FromBody] WebsiteRegistration updated)
    {
        var registration = await _registrationService.UpdateRegistrationAsync(id, updated);
        return Ok(registration);
    }

    [HttpPost("{id}/convert")]
    [Authorize(Policy = "StaffOnly")]
    public async Task<IActionResult> ConvertToStudent(Guid id, [FromBody] ConvertRegistrationDto dto)
    {
        await _registrationService.ConvertToStudentAsync(id, dto);
        return Ok(new { message = "Lead successfully promoted and converted to student profile." });
    }
}
