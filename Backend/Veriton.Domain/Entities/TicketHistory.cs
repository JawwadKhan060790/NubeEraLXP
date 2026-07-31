using System;
using Veriton.Domain.Common;

namespace Veriton.Domain.Entities;

public class TicketHistory : BaseEntity
{
    public Guid TicketId { get; set; }
    public Guid UserId { get; set; }
    
    public string Action { get; set; } = string.Empty;
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }

    // Navigation Properties
    public Ticket Ticket { get; set; } = null!;
    public User User { get; set; } = null!;
}
