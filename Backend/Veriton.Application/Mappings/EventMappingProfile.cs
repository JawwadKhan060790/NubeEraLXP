using System.Text.Json;
using AutoMapper;
using Veriton.Application.DTOs;
using Veriton.Domain.Entities;

namespace Veriton.Application.Mappings;

/// <summary>AutoMapper profile for the Events module.</summary>
public class EventMappingProfile : Profile
{
    public EventMappingProfile()
    {
        // CreateEventDto → Event entity
        CreateMap<CreateEventDto, Event>()
            .ForMember(dest => dest.Id,            opt => opt.Ignore())
            .ForMember(dest => dest.SchoolId,      opt => opt.Ignore()) // Set in service from current user
            .ForMember(dest => dest.Status,        opt => opt.MapFrom(_ => "Upcoming"))
            .ForMember(dest => dest.Registrations, opt => opt.Ignore())
            .ForMember(dest => dest.School,        opt => opt.Ignore())
            .ForMember(dest => dest.CustomFieldsJson, opt => opt.MapFrom(src =>
                src.CustomFields != null
                    ? JsonSerializer.Serialize(src.CustomFields)
                    : "[]"));
    }
}
