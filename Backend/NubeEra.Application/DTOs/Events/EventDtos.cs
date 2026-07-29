using System;
using System.Collections.Generic;

namespace NubeEra.Application.DTOs;

public class CreateEventDto
{
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
    public string[]? CustomFields { get; set; }
    public Guid? SchoolId { get; set; }
}

public class SubmitRegistrationDto
{
    public Guid StudentId { get; set; }
    public string StudentName { get; set; } = null!;
    public string StudentGrade { get; set; } = null!;
    public string StudentSchool { get; set; } = null!;
    public string ParentName { get; set; } = null!;
    public string ParentPhone { get; set; } = null!;
    public string ParentEmail { get; set; } = null!;
    public Dictionary<string, string>? CustomFieldValues { get; set; }
    public List<AttachmentDto>? Attachments { get; set; }
}

public class AttachmentDto
{
    public string Name { get; set; } = null!;
    public string Type { get; set; } = null!;
}

public class HistoryDto
{
    public string User { get; set; } = null!;
    public string Role { get; set; } = null!;
    public string Date { get; set; } = null!;
    public string Action { get; set; } = null!;
}

public class UpdateStatusDto
{
    public string Status { get; set; } = null!;
}

public class UpdateAttendanceDto
{
    public string AttendanceStatus { get; set; } = null!;
}

public class LogResultDto
{
    public string? Result { get; set; }
}
