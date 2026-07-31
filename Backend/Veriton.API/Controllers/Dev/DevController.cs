using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Veriton.Infrastructure.Persistence.DbContext;

namespace Veriton.API.Controllers.Dev;

[ApiController]
[Route("api/dev")]
[AllowAnonymous] // ← This allows public access!
public class DevController : ControllerBase
{
    private readonly AppDbContext _context;

    public DevController(AppDbContext context)
    {
        _context = context;
    }


    [HttpGet("hash")]
    public IActionResult Hash([FromQuery] string password)
    {
        if (string.IsNullOrEmpty(password))
            return BadRequest(new { error = "Password required" });

        var hash = BCrypt.Net.BCrypt.HashPassword(password);

        return Ok(new
        {
            password = password,
            hash = hash,
            message = "Password hashed successfully"
        });
    }

    [HttpGet("test-verify")]
    public async Task<IActionResult> TestVerify([FromQuery] string email, [FromQuery] string password)
    {
        var user = await _context.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Email == email);
        if (user == null) return NotFound(new { error = "User not found" });

        bool verifyResult = false;
        string? errorMsg = null;
        try
        {
            verifyResult = BCrypt.Net.BCrypt.Verify(password, user.PasswordHash);
        }
        catch (Exception ex)
        {
            errorMsg = ex.ToString();
        }

        return Ok(new
        {
            email = email,
            passwordLength = password?.Length,
            hashInDb = user.PasswordHash,
            verifyResult = verifyResult,
            exception = errorMsg
        });
    }
}
