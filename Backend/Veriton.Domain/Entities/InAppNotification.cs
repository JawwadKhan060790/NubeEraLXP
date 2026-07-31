using System;
using Veriton.Domain.Common;

namespace Veriton.Domain.Entities;

public class InAppNotification : BaseEntity
{
    public Guid UserId { get; set; }
    public string Message { get; set; } = string.Empty;
    public string LinkUrl { get; set; } = string.Empty;
    public bool IsRead { get; set; } = false;

    // Navigation Properties
    public User User { get; set; } = null!;
}
