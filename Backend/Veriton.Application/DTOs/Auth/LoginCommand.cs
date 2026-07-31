using MediatR;
using Veriton.Application.DTOs; 

namespace Veriton.Application.Features.Auth;

public record LoginCommand(string Email, string Password)
    : IRequest<LoginResponseDto>;
