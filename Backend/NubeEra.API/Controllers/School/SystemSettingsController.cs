using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NubeEra.Domain.Entities;
using NubeEra.Infrastructure.Persistence.DbContext;

namespace NubeEra.API.Controllers.School;

[ApiController]
[Route("api/system-settings")]
[Authorize]
public class SystemSettingsController : ControllerBase
{
    private readonly AppDbContext _context;

    public SystemSettingsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetSettings()
    {
        var settings = await _context.SystemSettings
            .ToDictionaryAsync(x => x.Key, x => x.Value);
        return Ok(settings);
    }

    [HttpPut("{key}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> UpdateSetting(string key, [FromBody] UpdateSettingDto dto)
    {
        if (string.IsNullOrWhiteSpace(key))
        {
            return BadRequest(new { message = "Key cannot be empty." });
        }

        var setting = await _context.SystemSettings.FirstOrDefaultAsync(x => x.Key == key);
        if (setting == null)
        {
            setting = new SystemSetting { Key = key, Value = dto.Value ?? string.Empty };
            _context.SystemSettings.Add(setting);
        }
        else
        {
            setting.Value = dto.Value ?? string.Empty;
            _context.SystemSettings.Update(setting);
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }
}

public class UpdateSettingDto
{
    public string Value { get; set; } = string.Empty;
}
