using System;
using Veriton.Domain.Common;

namespace Veriton.Domain.Entities;

public class TicketAttachment : BaseEntity
{
    public Guid TicketId { get; set; }
    public Guid? TicketCommentId { get; set; }
    
    public string FileName { get; set; } = string.Empty;
    public string FileUrl { get; set; } = string.Empty;
    public string FileType { get; set; } = string.Empty;
    public long FileSize { get; set; }

    // Navigation Properties
    public Ticket Ticket { get; set; } = null!;
    public TicketComment? TicketComment { get; set; }
}
