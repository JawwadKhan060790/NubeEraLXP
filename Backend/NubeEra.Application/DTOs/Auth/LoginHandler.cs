using BCrypt.Net;
using MediatR;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Repositories;
using NubeEra.Application.Interfaces.Security;


namespace NubeEra.Application.Features.Auth;

public class LoginHandler : IRequestHandler<LoginCommand, LoginResponseDto>
{
    private readonly IUserRepository _userRepository;
    private readonly IJwtTokenService _jwtService;

    public LoginHandler(
        IUserRepository userRepository,
        IJwtTokenService jwtService)
    {
        _userRepository = userRepository;
        _jwtService = jwtService;
    }

    public async Task<LoginResponseDto> Handle(
        LoginCommand request,
        CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByEmailAsync(request.Email);

        if (user is null || !SafeVerify(request.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid credentials");

        var token = _jwtService.GenerateToken(user);

        return new LoginResponseDto { Token = token };
    }

    private static bool SafeVerify(string password, string hash)
    {
        if (string.IsNullOrEmpty(hash)) return false;
        try
        {
            var result = BCrypt.Net.BCrypt.Verify(password, hash);
            if (!result)
            {
                Console.WriteLine($"[SafeVerify LoginHandler Fail] pwdLength: {password?.Length}, hashLength: {hash?.Length}, hashStart: {hash?[..Math.Min(10, hash.Length)]}");
            }
            return result;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[SafeVerify LoginHandler Exception] pwdLength: {password?.Length}, hashLength: {hash?.Length}. Error: {ex}");
            return false;
        }
    }
}
