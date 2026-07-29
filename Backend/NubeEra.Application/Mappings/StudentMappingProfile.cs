using AutoMapper;
using NubeEra.Application.DTOs;
using NubeEra.Domain.Entities;

namespace NubeEra.Application.Mappings;

/// <summary>AutoMapper profile for the Student module.</summary>
public class StudentMappingProfile : Profile
{
    public StudentMappingProfile()
    {
        // Entity → Response DTO
        CreateMap<Student, StudentDto>()
            .ForMember(dest => dest.SchoolName,   opt => opt.MapFrom(src => src.School != null ? src.School.Name : string.Empty))
            .ForMember(dest => dest.GradeName,    opt => opt.MapFrom(src => src.Grade  != null ? src.Grade.GradeName : string.Empty))
            .ForMember(dest => dest.FullName,     opt => opt.MapFrom(src => $"{src.FirstName} {src.LastName}".Trim()))
            .ForMember(dest => dest.ProgressPercentage, opt => opt.Ignore()); // Computed separately in service

        // Create DTO → Entity  (password hashing handled in service, not here)
        CreateMap<StudentCreateDto, Student>()
            .ForMember(dest => dest.Id,        opt => opt.Ignore())
            .ForMember(dest => dest.School,    opt => opt.Ignore())
            .ForMember(dest => dest.Grade,     opt => opt.Ignore())
            .ForMember(dest => dest.User,      opt => opt.Ignore())
            .ForMember(dest => dest.UserId,    opt => opt.Ignore())
            .ForMember(dest => dest.IsActive,  opt => opt.MapFrom(_ => true));

        // Update DTO → existing Entity (for Patch-style update via service)
        CreateMap<StudentUpdateDto, Student>()
            .ForMember(dest => dest.Id,     opt => opt.Ignore())
            .ForMember(dest => dest.School, opt => opt.Ignore())
            .ForMember(dest => dest.Grade,  opt => opt.Ignore())
            .ForMember(dest => dest.User,   opt => opt.Ignore())
            .ForMember(dest => dest.UserId, opt => opt.Ignore());
    }
}
