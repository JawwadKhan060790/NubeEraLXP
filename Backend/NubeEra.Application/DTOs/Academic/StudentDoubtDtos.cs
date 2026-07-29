namespace NubeEra.Application.DTOs.Academic;

// ── Create (student raises a doubt) ─────────────────────────────────────────

public class StudentDoubtCreateDto
{
    public string Title       { get; set; } = null!;
    public string Description { get; set; } = null!;
    /// <summary>Optional — link doubt to a specific topic.</summary>
    public Guid? LessonId     { get; set; }
    /// <summary>Optional uploaded screenshot URL.</summary>
    public string? ScreenshotUrl { get; set; }
}

// ── Teacher reply ─────────────────────────────────────────────────────────────

public class StudentDoubtReplyDto
{
    public string Reply { get; set; } = null!;
}

// ── Full read model ───────────────────────────────────────────────────────────

public class StudentDoubtDto
{
    public Guid   Id          { get; set; }
    public string Title       { get; set; } = null!;
    public string Description { get; set; } = null!;
    public string? ScreenshotUrl { get; set; }
    public string Status      { get; set; } = "Open";

    // Student context
    public Guid   StudentId       { get; set; }
    public string StudentName     { get; set; } = null!;
    public string StudentEmail    { get; set; } = null!;

    // School context
    public Guid   SchoolId        { get; set; }
    public string SchoolName      { get; set; } = null!;

    // Grade / Section
    public Guid   GradeId         { get; set; }
    public string GradeName       { get; set; } = null!;
    public Guid?  SectionId       { get; set; }
    public string? SectionName    { get; set; }

    // Topic context (optional)
    public Guid?  LessonId        { get; set; }
    public string? LessonTitle    { get; set; }
    public Guid?  ModuleId        { get; set; }
    public string? ModuleName     { get; set; }

    // Teacher reply
    public string? TeacherReply     { get; set; }
    public DateTime? RepliedAt      { get; set; }
    public string? RepliedByTeacher { get; set; }

    // Timestamps
    public DateTime CreatedAt     { get; set; }
    public DateTime? ClosedAt     { get; set; }
}

// ── Condensed list item ────────────────────────────────────────────────────────

public class StudentDoubtListItemDto
{
    public Guid   Id           { get; set; }
    public string Title        { get; set; } = null!;
    public string Status       { get; set; } = "Open";
    public string StudentName  { get; set; } = null!;
    public string SchoolName   { get; set; } = null!;
    public string GradeName    { get; set; } = null!;
    public string? SectionName { get; set; }
    public string? LessonTitle { get; set; }
    public string? ModuleName  { get; set; }
    public string? ScreenshotUrl { get; set; }
    public bool   HasReply     { get; set; }
    public DateTime CreatedAt  { get; set; }
}

// ── Admin/Staff filters ────────────────────────────────────────────────────────

public class StudentDoubtFilterDto
{
    public Guid?   SchoolId   { get; set; }
    public Guid?   GradeId    { get; set; }
    public Guid?   SectionId  { get; set; }
    public string? Status     { get; set; }
    public string? Search     { get; set; }
    public int     Page       { get; set; } = 1;
    public int     PageSize   { get; set; } = 20;
}
