using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Security;
using NubeEra.Application.Interfaces.Services;
using NubeEra.Domain.Constants;

namespace NubeEra.API.Controllers.TeacherSpace;

/// <summary>
/// Teacher Schedule Periods — daily/weekly/monthly calendar and period status management.
/// </summary>
[ApiController]
[Route("api/teacher/schedule-periods")]
[Authorize(Policy = AppPolicies.TeacherOnly)]
public class TeacherSchedulePeriodController : ControllerBase
{
    private readonly ITeacherSchedulePeriodService _service;
    private readonly ICurrentUserService           _currentUserService;

    public TeacherSchedulePeriodController(
        ITeacherSchedulePeriodService service,
        ICurrentUserService           currentUserService)
    {
        _service            = service;
        _currentUserService = currentUserService;
    }

    private Guid ResolveTeacherId(Guid? requestedId = null)
    {
        if (requestedId.HasValue && requestedId != Guid.Empty &&
            (_currentUserService.Role?.Equals("Teacher", StringComparison.OrdinalIgnoreCase) == false))
            return requestedId.Value;

        return _currentUserService.TeacherId
            ?? throw new UnauthorizedAccessException("Teacher identity not found in token.");
    }

    /// <summary>GET /api/teacher/schedule-periods/daily?date=2026-06-14</summary>
    [HttpGet("daily")]
    public async Task<IActionResult> GetDailySchedule(
        [FromQuery] DateTime? date = null,
        [FromQuery] Guid?     teacherId = null)
    {
        try
        {
            var tid = ResolveTeacherId(teacherId);
            var day = date?.Date ?? DateTime.UtcNow.Date;
            return Ok(await _service.GetDailyScheduleAsync(tid, day));
        }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
        catch (Exception                   ex) { return BadRequest(new   { message = ex.Message }); }
    }

    /// <summary>GET /api/teacher/schedule-periods/weekly?weekStart=2026-06-09</summary>
    [HttpGet("weekly")]
    public async Task<IActionResult> GetWeeklySchedule(
        [FromQuery] DateTime? weekStart = null,
        [FromQuery] Guid?     teacherId = null)
    {
        try
        {
            var tid   = ResolveTeacherId(teacherId);
            var start = weekStart?.Date ?? GetCurrentWeekMonday();
            return Ok(await _service.GetWeeklyScheduleAsync(tid, start));
        }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
        catch (Exception                   ex) { return BadRequest(new   { message = ex.Message }); }
    }

    /// <summary>GET /api/teacher/schedule-periods/monthly?year=2026&month=6</summary>
    [HttpGet("monthly")]
    public async Task<IActionResult> GetMonthlyCalendar(
        [FromQuery] int?  year      = null,
        [FromQuery] int?  month     = null,
        [FromQuery] Guid? teacherId = null)
    {
        try
        {
            var tid  = ResolveTeacherId(teacherId);
            var now  = DateTime.UtcNow;
            return Ok(await _service.GetMonthlyCalendarAsync(tid, year ?? now.Year, month ?? now.Month));
        }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
        catch (Exception                   ex) { return BadRequest(new   { message = ex.Message }); }
    }

    /// <summary>PUT /api/teacher/schedule-periods/{schedulerId}/status?periodDate=2026-06-14</summary>
    [HttpPut("{schedulerId:guid}/status")]
    public async Task<IActionResult> UpdatePeriodStatus(
        Guid schedulerId,
        [FromQuery] DateTime periodDate,
        [FromBody]  UpdatePeriodStatusDto dto,
        [FromQuery] Guid? teacherId = null)
    {
        try
        {
            var tid = ResolveTeacherId(teacherId);
            var result = await _service.UpdatePeriodStatusAsync(tid, schedulerId, periodDate, dto);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
        catch (KeyNotFoundException        ex) { return NotFound(new    { message = ex.Message }); }
        catch (ArgumentException           ex) { return BadRequest(new  { message = ex.Message }); }
    }

    /// <summary>POST /api/teacher/schedule-periods/seed-today — Seed today's period rows.</summary>
    [HttpPost("seed-today")]
    public async Task<IActionResult> SeedToday([FromQuery] Guid? teacherId = null)
    {
        try
        {
            var tid = ResolveTeacherId(teacherId);
            await _service.SeedTodayPeriodsAsync(tid);
            return Ok(new { message = "Today's periods seeded." });
        }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
        catch (Exception                   ex) { return BadRequest(new   { message = ex.Message }); }
    }

    private static DateTime GetCurrentWeekMonday()
    {
        var today = DateTime.UtcNow.Date;
        int diff  = (7 + (today.DayOfWeek - DayOfWeek.Monday)) % 7;
        return today.AddDays(-diff);
    }
}
