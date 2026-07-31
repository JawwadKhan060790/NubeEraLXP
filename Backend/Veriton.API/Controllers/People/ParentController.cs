using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using Veriton.Application.Interfaces.Services;

namespace Veriton.API.Controllers.People;

[ApiController]
[Route("api/parent")]
[Authorize]
public class ParentController : ControllerBase
{
    private readonly IParentService _parentService;

    public ParentController(IParentService parentService)
    {
        _parentService = parentService;
    }

    [HttpGet("dashboard")]
    [Authorize(Roles = "Parent")]
    public async Task<IActionResult> GetParentDashboard([FromQuery] string? statusFilter = null)
    {
        var dashboard = await _parentService.GetParentDashboardAsync(statusFilter);
        return Ok(dashboard);
    }
}

