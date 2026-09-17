using Microsoft.AspNetCore.Http;
using System.Security.Claims;
using NubeEra.Application.Interfaces.Security;

namespace NubeEra.Infrastructure.Security;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public string? UserId => _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier) 
                          ?? _httpContextAccessor.HttpContext?.User?.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)
                          ?? _httpContextAccessor.HttpContext?.User?.FindFirstValue("UserId")
                          ?? _httpContextAccessor.HttpContext?.User?.FindFirstValue("sub")
                          ?? _httpContextAccessor.HttpContext?.User?.FindFirstValue("id");

    public string? Role => _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.Role)
                        ?? _httpContextAccessor.HttpContext?.User?.FindFirstValue("role")
                        ?? _httpContextAccessor.HttpContext?.User?.FindFirstValue("utype")
                        ?? _httpContextAccessor.HttpContext?.User?.Claims.FirstOrDefault(c => c.Type.EndsWith("/role", StringComparison.OrdinalIgnoreCase))?.Value;

    public Guid? SchoolId => GetGuidClaim("SchoolId");

    public Guid? TeacherId => GetGuidClaim("TeacherId");

    public Guid? StudentId => GetGuidClaim("StudentId");

    public Guid? GradeId => GetGuidClaim("GradeId");

    public Guid? GradeLevelId => GetGuidClaim("GradeLevelId");

    public bool IsAuthenticated => _httpContextAccessor.HttpContext?.User?.Identity?.IsAuthenticated ?? false;

    public ClaimsPrincipal User => _httpContextAccessor.HttpContext?.User ?? new ClaimsPrincipal();

    private Guid? GetGuidClaim(string claimType)
    {
        var user = _httpContextAccessor.HttpContext?.User;
        if (user == null) return null;

        var value = user.FindFirstValue(claimType)
                 ?? user.FindFirstValue(claimType.ToLowerInvariant())
                 ?? user.Claims.FirstOrDefault(c => string.Equals(c.Type, claimType, StringComparison.OrdinalIgnoreCase))?.Value;

        return Guid.TryParse(value, out var guid) ? guid : null;
    }
}
