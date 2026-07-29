using System;
using NubeEra.Domain.Common;

namespace NubeEra.Domain.Entities;

public class InAppNotification : BaseEntity
{
    public Guid UserId { get; set; }
    public string Message { get; set; } = string.Empty;
    public string LinkUrl { get; set; } = string.Empty;
    public bool IsRead { get; set; } = false;

    // Navigation Properties
    public User User { get; set; } = null!;
}
