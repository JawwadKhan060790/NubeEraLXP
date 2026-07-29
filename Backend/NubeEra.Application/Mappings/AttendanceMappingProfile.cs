using AutoMapper;
using NubeEra.Application.DTOs;
using NubeEra.Domain.Entities;

namespace NubeEra.Application.Mappings;

/// <summary>AutoMapper profile for the Attendance module.</summary>
public class AttendanceMappingProfile : Profile
{
    public AttendanceMappingProfile()
    {
        CreateMap<Attendance, AttendanceDto>()
            .ForMember(dest => dest.Status,      opt => opt.MapFrom(src => src.Status.ToString()))
            .ForMember(dest => dest.TeacherName, opt => opt.MapFrom(src => src.Teacher != null
                ? $"{src.Teacher.FirstName} {src.Teacher.LastName}".Trim()
                : null))
            .ForMember(dest => dest.StudentName, opt => opt.MapFrom(src => src.Student != null
                ? $"{src.Student.FirstName} {src.Student.LastName}".Trim()
                : null));

        CreateMap<AttendanceDto, Attendance>()
            .ForMember(dest => dest.Id,       opt => opt.Ignore())
            .ForMember(dest => dest.SchoolId, opt => opt.Ignore()) // Set in service
            .ForMember(dest => dest.Status,   opt => opt.MapFrom(src => ParseStatus(src.Status)))
            .ForMember(dest => dest.Teacher,  opt => opt.Ignore())
            .ForMember(dest => dest.Student,  opt => opt.Ignore());
    }

    // AutoMapper MapFrom lambdas are compiled as expression trees — they cannot contain
    // out-variable declarations (CS8198). Extract to a plain static helper instead.
    private static AttendanceStatus ParseStatus(string? status) =>
        Enum.TryParse<AttendanceStatus>(status, ignoreCase: true, out var result)
            ? result
            : AttendanceStatus.Present;
}
