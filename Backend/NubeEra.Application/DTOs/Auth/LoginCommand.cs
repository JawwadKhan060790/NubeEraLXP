using MediatR;
using NubeEra.Application.DTOs; 

namespace NubeEra.Application.Features.Auth;

public record LoginCommand(string Email, string Password)
    : IRequest<LoginResponseDto>;
