using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using Veriton.Application.Interfaces.Services.Ecommerce;

namespace Veriton.API.Controllers.Ecommerce;

[ApiController]
[Route("api/ecommerce/dashboard")]
[Authorize(Policy = "StaffOnly")]
public class EcommerceDashboardController : ControllerBase
{
    private readonly IEcommerceDashboardService _dashboardService;

    public EcommerceDashboardController(IEcommerceDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var stats = await _dashboardService.GetStatsAsync();
        return Ok(stats);
    }
}
