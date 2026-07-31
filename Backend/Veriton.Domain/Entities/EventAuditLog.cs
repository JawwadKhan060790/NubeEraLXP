using System;
using Veriton.Domain.Common;

namespace Veriton.Domain.Entities;

public class EventAuditLog : BaseEntity
{
    public Guid? SchoolId { get; set; }
    public string UserName { get; set; } = null!;
    public string Role { get; set; } = null!;
    public DateTime DateTime { get; set; } = DateTime.UtcNow;
    public string ActionPerformed { get; set; } = null!;
    
    // Navigation properties
    public School? School { get; set; }
}
