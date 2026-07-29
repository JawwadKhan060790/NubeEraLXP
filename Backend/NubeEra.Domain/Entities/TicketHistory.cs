using System;
using NubeEra.Domain.Common;

namespace NubeEra.Domain.Entities;

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
