using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Services;
using NubeEra.Domain.Common;

namespace NubeEra.API.Controllers.School;

[ApiController]
[Route("api/schedulers")]
[Authorize]
public class SchedulersController : ControllerBase
{
    private readonly IGenericService<SchedulerCreateDto, SchedulerUpdateDto, SchedulerDto> _service;

    public SchedulersController(IGenericService<SchedulerCreateDto, SchedulerUpdateDto, SchedulerDto> service)
    {
        _service = service;
    }

    /// <summary>
    /// Get all schedules. Accessible by all authenticated roles.
    /// </summary>
    [HttpGet]
    [Authorize(Policy = "StudentOnly")]
    public async Task<IActionResult> GetAll()
        => Ok(await _service.GetAllAsync());

    [HttpGet("{id}")]
    [Authorize(Policy = "StudentOnly")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var scheduler = await _service.GetByIdAsync(id);
        return scheduler == null ? NotFound() : Ok(scheduler);
    }

    [HttpPost]
    [Authorize(Policy = "TeacherOnly")]  // Staff and above can create schedules
    public async Task<IActionResult> Create(SchedulerCreateDto dto)
        => Ok(new { id = await _service.CreateAsync(dto) });

    [HttpPut("{id}")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> Update(Guid id, SchedulerUpdateDto dto)
    {
        await _service.UpdateAsync(id, dto);
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "TeacherOnly")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }
}

