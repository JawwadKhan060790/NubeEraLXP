using AutoMapper;
using Veriton.Application.DTOs;
using Veriton.Domain.Entities;

namespace Veriton.Application.Mappings;

/// <summary>AutoMapper profile for the Authentication module.</summary>
public class AuthMappingProfile : Profile
{
    public AuthMappingProfile()
    {
        // User entity → UserProfileDto
        // UType and SchoolId/TeacherId/StudentId are resolved by IAuthService at runtime
        // because they require joins to Teacher/Student tables; map only the scalar fields here.
        CreateMap<User, UserProfileDto>()
            .ForMember(dest => dest.FullName,        opt => opt.MapFrom(src => $"{src.FirstName} {src.LastName}".Trim()))
            // User.Role is a navigation property — map the string name explicitly
            .ForMember(dest => dest.Role,            opt => opt.MapFrom(src => src.Role != null ? src.Role.RoleName : string.Empty))
            // UType, teacher/student/grade ids and school details require service-layer joins — ignored here
            .ForMember(dest => dest.UType,           opt => opt.Ignore())
            .ForMember(dest => dest.SchoolId,        opt => opt.Ignore())
            .ForMember(dest => dest.SchoolName,      opt => opt.Ignore())
            .ForMember(dest => dest.TeacherId,       opt => opt.Ignore())
            .ForMember(dest => dest.StudentId,       opt => opt.Ignore())
            .ForMember(dest => dest.GradeId,         opt => opt.Ignore())
            .ForMember(dest => dest.ProfileImageUrl, opt => opt.MapFrom(src => src.ProfileImageUrl));
    }
}
