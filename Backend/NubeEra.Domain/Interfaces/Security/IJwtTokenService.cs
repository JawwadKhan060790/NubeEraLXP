using NubeEra.Domain.Entities;

namespace NubeEra.Application.Interfaces.Security;

public interface IJwtTokenService
{
    string GenerateToken(User user);
}
