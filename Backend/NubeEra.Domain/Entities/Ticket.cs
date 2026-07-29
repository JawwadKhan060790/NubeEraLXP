using System;
using System.Collections.Generic;
using NubeEra.Domain.Common;

namespace NubeEra.Domain.Entities;

public class Ticket : BaseEntity, IMultiTenant
{
    public Guid SchoolId { get; set; }
    public string TicketNumber { get; set; } = string.Empty;
    
    public Guid RequesterUserId { get; set; }
    public Guid? AssignedToUserId { get; set; }
    
    public string Subject { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    
    public TicketPriority Priority { get; set; } = TicketPriority.Medium;
    public TicketStatus Status { get; set; } = TicketStatus.Open;
    
    public Guid CategoryId { get; set; }
    public DateTime? ResolvedAt { get; set; }

    // Navigation Properties
    public School School { get; set; } = null!;
    public User RequesterUser { get; set; } = null!;
    public User? AssignedToUser { get; set; }
    public TicketCategory Category { get; set; } = null!;
    
    public ICollection<TicketComment> Comments { get; set; } = new List<TicketComment>();
    public ICollection<TicketAttachment> Attachments { get; set; } = new List<TicketAttachment>();
    public ICollection<TicketHistory> History { get; set; } = new List<TicketHistory>();
}
