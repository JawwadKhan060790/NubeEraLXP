using Veriton.Domain.Entities;

namespace Veriton.Application.Interfaces.Security;

public interface IJwtTokenService
{
    string GenerateToken(User user);
}
