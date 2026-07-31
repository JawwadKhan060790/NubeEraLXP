using AutoMapper;
using Veriton.Application.DTOs;
using Veriton.Domain.Entities;

namespace Veriton.Application.Mappings;

/// <summary>AutoMapper profile for the Support Tickets module.</summary>
public class SupportTicketMappingProfile : Profile
{
    public SupportTicketMappingProfile()
    {
        // CreateTicketDto → Ticket entity
        CreateMap<CreateTicketDto, Ticket>()
            .ForMember(dest => dest.Id,               opt => opt.Ignore())
            .ForMember(dest => dest.SchoolId,         opt => opt.Ignore()) // Set from current user in service
            .ForMember(dest => dest.TicketNumber,     opt => opt.Ignore()) // Generated in service
            .ForMember(dest => dest.RequesterUserId,  opt => opt.Ignore()) // Set from current user in service
            .ForMember(dest => dest.AssignedToUserId, opt => opt.Ignore())
            .ForMember(dest => dest.Status,           opt => opt.MapFrom(_ => TicketStatus.Open))
            .ForMember(dest => dest.ResolvedAt,       opt => opt.Ignore())
            .ForMember(dest => dest.School,           opt => opt.Ignore())
            .ForMember(dest => dest.Attachments,      opt => opt.Ignore()) // Handled separately in service
            .ForMember(dest => dest.Comments,         opt => opt.Ignore())
            .ForMember(dest => dest.History,          opt => opt.Ignore())
            .ForMember(dest => dest.Category,         opt => opt.Ignore());

        // CreateAttachmentDto → TicketAttachment
        CreateMap<CreateAttachmentDto, TicketAttachment>()
            .ForMember(dest => dest.Id,              opt => opt.Ignore())
            .ForMember(dest => dest.TicketId,        opt => opt.Ignore())
            .ForMember(dest => dest.TicketCommentId, opt => opt.Ignore())
            .ForMember(dest => dest.Ticket,          opt => opt.Ignore())
            .ForMember(dest => dest.TicketComment,   opt => opt.Ignore());

        // CreateCategoryDto → TicketCategory
        CreateMap<CreateCategoryDto, TicketCategory>()
            .ForMember(dest => dest.Id,       opt => opt.Ignore())
            .ForMember(dest => dest.SchoolId, opt => opt.Ignore())
            .ForMember(dest => dest.IsActive, opt => opt.MapFrom(_ => true))
            .ForMember(dest => dest.School,   opt => opt.Ignore());
    }
}
