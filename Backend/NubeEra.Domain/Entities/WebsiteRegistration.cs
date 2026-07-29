using System;
using NubeEra.Domain.Common;

namespace NubeEra.Domain.Entities;

public class WebsiteRegistration : BaseEntity
{
    public string StudentFullName { get; set; } = null!;
    public string MobileNumber { get; set; } = null!;
    public string? EmailAddress { get; set; }
    public string? City { get; set; }
    public string? GradeInterestedIn { get; set; }
    public string InterestedProgram { get; set; } = null!;
    public string ParentName { get; set; } = null!;
    public string ParentMobileNumber { get; set; } = null!;
    public string? Message { get; set; }
    public bool Consent { get; set; }
    public string Status { get; set; } = "New"; // "New", "Under Review", "Contacted", "Documents Pending", "Approved", "Rejected", "Converted"
}
