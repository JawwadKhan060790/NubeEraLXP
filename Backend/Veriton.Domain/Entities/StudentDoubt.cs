using Veriton.Domain.Common;

namespace Veriton.Domain.Entities;

public class StudentDoubt : BaseEntity, IMultiTenant
{
    public Guid SchoolId    { get; set; }
    public Guid StudentId   { get; set; }
    public Guid GradeId     { get; set; }
    public Guid? SectionId  { get; set; }

    /// <summary>Optional — null means a general (non-topic) doubt.</summary>
    public Guid? LessonId   { get; set; }
    /// <summary>Auto-resolved from LessonId.ModuleId on creation.</summary>
    public Guid? ModuleId   { get; set; }

    public string Title       { get; set; } = null!;
    public string Description { get; set; } = null!;

    /// <summary>URL of an uploaded screenshot (optional).</summary>
    public string? ScreenshotUrl { get; set; }

    /// <summary>Open | Answered | Closed</summary>
    public string Status { get; set; } = "Open";

    // ── Teacher Response ──────────────────────────────────────────────────────
    public string? TeacherReply        { get; set; }
    public DateTime? RepliedAt         { get; set; }
    public Guid? RepliedByTeacherId    { get; set; }

    // ── Closure ───────────────────────────────────────────────────────────────
    public DateTime? ClosedAt          { get; set; }
    public Guid? ClosedByUserId        { get; set; }

    // ── Navigation ───────────────────────────────────────────────────────────
    public School        School   { get; set; } = null!;
    public Student       Student  { get; set; } = null!;
    public Grade         Grade    { get; set; } = null!;
    public GradeSection? Section  { get; set; }
    public Lesson?       Lesson   { get; set; }
    public Module?       Module   { get; set; }
    public Teacher?      RepliedByTeacher { get; set; }
}
