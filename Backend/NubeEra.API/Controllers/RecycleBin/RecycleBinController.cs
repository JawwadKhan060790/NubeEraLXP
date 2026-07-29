using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NubeEra.Application.Interfaces.Services;

namespace NubeEra.API.Controllers.RecycleBin;

/// <summary>
/// Recycle Bin — soft-deleted record management.
///
/// Access rules:
///   Admin / SuperAdmin → GET (list + summary) + POST (restore)
///   SuperAdmin only    → DELETE (permanent delete)
/// </summary>
[ApiController]
[Route("api/recycle-bin")]
[Authorize(Roles = "Admin,SuperAdmin")]
public class RecycleBinController : ControllerBase
{
    private readonly IRecycleBinService _service;

    public RecycleBinController(IRecycleBinService service)
    {
        _service = service;
    }

    /// <summary>
    /// GET api/recycle-bin/summary
    /// Returns the count of soft-deleted records per entity type.
    /// Used by the UI to show badge numbers on the sidebar.
    /// </summary>
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var summary = await _service.GetSummaryAsync();
        return Ok(summary);
    }

    /// <summary>
    /// GET api/recycle-bin?entityType=School&amp;page=1&amp;pageSize=20
    /// Returns a paginated list of soft-deleted records for the given entity type.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetDeletedItems(
        [FromQuery] string entityType,
        [FromQuery] int page     = 1,
        [FromQuery] int pageSize = 20)
    {
        if (string.IsNullOrWhiteSpace(entityType))
            return BadRequest("entityType query parameter is required.");

        if (!_service.SupportedEntityTypes.Contains(entityType))
            return BadRequest($"Unsupported entity type '{entityType}'. " +
                $"Supported: {string.Join(", ", _service.SupportedEntityTypes)}");

        var result = await _service.GetDeletedItemsAsync(entityType, page, pageSize);
        return Ok(result);
    }

    /// <summary>
    /// POST api/recycle-bin/{entityType}/{id}/restore
    /// Restores a soft-deleted record (Admin + SuperAdmin).
    /// </summary>
    [HttpPost("{entityType}/{id:guid}/restore")]
    public async Task<IActionResult> Restore(string entityType, Guid id)
    {
        var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var currentUserId))
            return Unauthorized();

        try
        {
            await _service.RestoreAsync(entityType, id, currentUserId);
            return Ok(new { message = $"{entityType} restored successfully." });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    /// <summary>
    /// DELETE api/recycle-bin/{entityType}/{id}
    /// Permanently removes a soft-deleted record from the database. SuperAdmin only.
    /// </summary>
    [HttpDelete("{entityType}/{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> PermanentDelete(string entityType, Guid id)
    {
        try
        {
            await _service.PermanentDeleteAsync(entityType, id);
            return Ok(new { message = $"{entityType} permanently deleted." });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }
}
