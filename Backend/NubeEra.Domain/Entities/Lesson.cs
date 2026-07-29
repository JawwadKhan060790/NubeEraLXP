using NubeEra.Domain.Common;

namespace NubeEra.Domain.Entities;

/// <summary>
/// Represents a Lesson ("Topic") within a Module ("Unit"), created by a Teacher/Staff/Admin.
/// Grade level and school-agnostic status are inherited from the parent Module; schools gain
/// access via <see cref="SchoolTopicAssignment"/>, assigned from /admin/curriculum-assignment.
/// </summary>
public class Lesson : BaseEntity
{
    public Guid ModuleId { get; set; }
    public string SubTopic { get; set; } = null!;
    public string? Activity { get; set; }
    public string? VideoUrl { get; set; }
    /// <summary>JSON array of ordered video URLs e.g. ["url1","url2"]. Null = use VideoUrl legacy field.</summary>
    public string? VideoUrls { get; set; }
    public string? DiagramUrl { get; set; } 
    public string? Source { get; set; }
    public string? Code { get; set; }
    public string? Procedure { get; set; }
    public string? RequiredMaterial { get; set; }
    public string? WhatYouGet { get; set; }
    public Guid? CreatedByTeacherId { get; set; }  // Nullable: Staff can create lessons without TeacherId
    public int SerialNumber { get; set; }
    public int TotalHours { get; set; } // Represented in minutes as per UI requirement
    public int ExpectedPeriods { get; set; } = 1;
    public int DisplayOrder { get; set; } = 0;
    public string? PdfFileUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsActivity { get; set; } = false;

    // ── Activity type flags ───────────────────────────────────────────────
    public bool IsRoboticsActivity { get; set; } = false;
    public bool IsPythonActivity { get; set; } = false;
    public bool IsAiToolActivity { get; set; } = false;
    /// <summary>Browser/tool URL shown inside the student 'Browser' tab when IsAiToolActivity is true.</summary>
    public string? BrowserUrl { get; set; }

    // Navigation Properties
    public Module Module { get; set; } = null!;
    public Teacher? CreatedByTeacher { get; set; }  // Nullable nav property
    public ICollection<Scheduler> Schedules { get; set; } = new List<Scheduler>();
    public ICollection<SchoolTopicAssignment> SchoolAssignments { get; set; } = new List<SchoolTopicAssignment>();
}
