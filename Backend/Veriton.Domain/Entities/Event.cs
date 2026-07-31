using System;
using System.Collections.Generic;
using Veriton.Domain.Common;

namespace Veriton.Domain.Entities;

public class Event : BaseEntity
{
    public Guid? SchoolId { get; set; }
    public string Title { get; set; } = null!;
    public string Description { get; set; } = null!;
    public string Category { get; set; } = null!;
    public DateTime Date { get; set; }
    public DateTime Deadline { get; set; }
    public string Venue { get; set; } = null!;
    public int MaxParticipants { get; set; }
    public int MaxTeams { get; set; }
    public int WaitlistLimit { get; set; }
    public bool AutoApproval { get; set; }
    public string Status { get; set; } = "Upcoming"; // "Upcoming", "Ongoing", "Completed", "Cancelled"
    public string CustomFieldsJson { get; set; } = "[]"; // Serialized string[] of dynamic field labels

    // Navigation properties
    public School? School { get; set; }
    public ICollection<EventRegistration> Registrations { get; set; } = new List<EventRegistration>();
}
