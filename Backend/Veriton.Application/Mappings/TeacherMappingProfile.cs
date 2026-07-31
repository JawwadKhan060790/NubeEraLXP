using AutoMapper;
using Veriton.Application.DTOs;
using Veriton.Domain.Entities;

namespace Veriton.Application.Mappings;

/// <summary>AutoMapper profile for the Teacher module.</summary>
public class TeacherMappingProfile : Profile
{
    public TeacherMappingProfile()
    {
        CreateMap<Teacher, TeacherDto>()
            .ForMember(dest => dest.SchoolName, opt => opt.MapFrom(src => src.School != null ? src.School.Name : string.Empty))
            .ForMember(dest => dest.FullName,   opt => opt.MapFrom(src => $"{src.FirstName} {src.LastName}".Trim()));

        CreateMap<TeacherCreateDto, Teacher>()
            .ForMember(dest => dest.Id,      opt => opt.Ignore())
            .ForMember(dest => dest.UserId,  opt => opt.Ignore())
            .ForMember(dest => dest.School,  opt => opt.Ignore())
            .ForMember(dest => dest.User,    opt => opt.Ignore())
            .ForMember(dest => dest.ClassTeacherGrades, opt => opt.Ignore())
            .ForMember(dest => dest.Modules,            opt => opt.Ignore())
            .ForMember(dest => dest.Lessons,            opt => opt.Ignore())
            .ForMember(dest => dest.Schedules,          opt => opt.Ignore())
            .ForMember(dest => dest.Exams,              opt => opt.Ignore())
            .ForMember(dest => dest.IsActive, opt => opt.MapFrom(_ => true));

        CreateMap<TeacherUpdateDto, Teacher>()
            .ForMember(dest => dest.Id,      opt => opt.Ignore())
            .ForMember(dest => dest.UserId,  opt => opt.Ignore())
            .ForMember(dest => dest.School,  opt => opt.Ignore())
            .ForMember(dest => dest.User,    opt => opt.Ignore())
            .ForMember(dest => dest.ClassTeacherGrades, opt => opt.Ignore())
            .ForMember(dest => dest.Modules,            opt => opt.Ignore())
            .ForMember(dest => dest.Lessons,            opt => opt.Ignore())
            .ForMember(dest => dest.Schedules,          opt => opt.Ignore())
            .ForMember(dest => dest.Exams,              opt => opt.Ignore());
    }
}
