using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using NubeEra.Application.Interfaces.Security;
using NubeEra.Domain.Entities;

namespace NubeEra.Infrastructure.Security;

public class JwtTokenService : IJwtTokenService
{
    private readonly IConfiguration _configuration;

    public JwtTokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateToken(User user)
    {
        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role.RoleName),
            new Claim("UserId", user.Id.ToString())
        };

        // Include SchoolId in JWT if the user belongs to a school
        if (user.SchoolId.HasValue)
        {
            claims.Add(new Claim("SchoolId", user.SchoolId.Value.ToString()));
        }

        // Include TeacherId if applicable
        if (user.TeacherProfile != null)
        {
            claims.Add(new Claim("TeacherId", user.TeacherProfile.Id.ToString()));
        }

        // Include StudentId if applicable
        if (user.StudentProfile != null)
        {
            claims.Add(new Claim("StudentId", user.StudentProfile.Id.ToString()));
            claims.Add(new Claim("GradeId", user.StudentProfile.GradeId.ToString()));

            // School-agnostic master grade level (1st..10th Grade), resolved from the
            // student's own per-school Grade row. Used to match against Module/Lesson's
            // GradeLevelId now that Units/Topics are grade-level-based, not per-school.
            if (user.StudentProfile.Grade?.GradeLevelId is Guid gradeLevelId)
            {
                claims.Add(new Claim("GradeLevelId", gradeLevelId.ToString()));
            }
        }

        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));

        var credentials = new SigningCredentials(
            key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(2),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
