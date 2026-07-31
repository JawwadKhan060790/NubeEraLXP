using System;
using Veriton.Domain.Common;

namespace Veriton.Domain.Entities;

public class TicketComment : BaseEntity
{
    public Guid TicketId { get; set; }
    public Guid UserId { get; set; }
    public string Content { get; set; } = string.Empty;
    public bool IsInternal { get; set; } = false;

    // Navigation Properties
    public Ticket Ticket { get; set; } = null!;
    public User User { get; set; } = null!;
}
