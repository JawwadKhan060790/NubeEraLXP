using System;
using NubeEra.Domain.Common;

namespace NubeEra.Domain.Entities;

public class EventRegistration : BaseEntity
{
    public Guid EventId { get; set; }
    public Guid StudentId { get; set; }
    
    // Captured contact data
    public string StudentName { get; set; } = null!;
    public string StudentGrade { get; set; } = null!;
    public string StudentSchool { get; set; } = null!;
    public string ParentName { get; set; } = null!;
    public string ParentPhone { get; set; } = null!;
    public string ParentEmail { get; set; } = null!;
    
    // Dynamic values stored as serialized json structures
    public string CustomFieldValuesJson { get; set; } = "{}"; // JSON Object containing dynamic entries
    public string AttachmentsJson { get; set; } = "[]"; // JSON List containing mock attachment file items
    
    // Active states
    public string Status { get; set; } = "Pending"; // "Pending", "Approved", "Waitlisted", "Rejected", "Cancelled", "Completed"
    public string AttendanceStatus { get; set; } = "TBD"; // "TBD", "Present", "Absent", "Excused"
    public string? EventResult { get; set; } // "Winner", "Runner Up", "Participant", etc.
    public string ApprovalHistoryJson { get; set; } = "[]"; // Serialized history events array

    // Navigation properties
    public Event Event { get; set; } = null!;
    public Student Student { get; set; } = null!;
}
