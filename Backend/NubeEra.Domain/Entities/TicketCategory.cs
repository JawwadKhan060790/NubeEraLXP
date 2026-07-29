using System;
using NubeEra.Domain.Common;

namespace NubeEra.Domain.Entities;

public class TicketCategory : BaseEntity, IMultiTenant
{
    public Guid SchoolId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    // Navigation Properties
    public School School { get; set; } = null!;
}
