using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using Veriton.Application.DTOs;
using Veriton.Application.Interfaces.Services.AI;

namespace Veriton.API.Controllers.AI;

[ApiController]
[Route("api/ai")]
[Authorize]
public class AIController : ControllerBase
{
    private readonly IAiService _aiService;

    public AIController(IAiService aiService)
    {
        _aiService = aiService;
    }

    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] AIChatRequest request)
    {
        var reply = await _aiService.ChatAsync(request);
        return Ok(new { reply = reply });
    }
}
