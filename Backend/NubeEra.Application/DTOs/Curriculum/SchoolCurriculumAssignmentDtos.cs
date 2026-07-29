using NubeEra.Application.Common.Models;

namespace NubeEra.Application.DTOs;

// ── School Curriculum Assignment DTOs ───────────────────────────────────────
// Backs Requirement 1 (School-Based Curriculum Assignment), Requirement 4
// (school-level visibility filtering) and Requirement 7.1/7.3 (Admin Curriculum
// Assignment screen + dashboard).

/// <summary>Bulk-assign one or more master Units to a School.</summary>
public class AssignUnitsToSchoolDto
{
    public Guid       SchoolId { get; set; }
    public List<Guid> UnitIds  { get; set; } = new();
    public string?    Notes    { get; set; }
}

/// <summary>Bulk-assign one or more master Topics to a School.</summary>
public class AssignTopicsToSchoolDto
{
    public Guid       SchoolId { get; set; }
    public List<Guid> TopicIds { get; set; } = new();
    public string?    Notes    { get; set; }
}

/// <summary>Bulk-unassign (soft delete) one or more Units from a School.</summary>
public class UnassignUnitsFromSchoolDto
{
    public Guid       SchoolId { get; set; }
    public List<Guid> UnitIds  { get; set; } = new();
    public string?    Notes    { get; set; }
}

/// <summary>Bulk-unassign (soft delete) one or more Topics from a School.</summary>
public class UnassignTopicsFromSchoolDto
{
    public Guid       SchoolId { get; set; }
    public List<Guid> TopicIds { get; set; } = new();
    public string?    Notes    { get; set; }
}

/// <summary>One failed item inside a bulk assign/unassign request.</summary>
public class BulkCurriculumAssignmentErrorDto
{
    public Guid   Id     { get; set; }
    public string Reason { get; set; } = null!;
}

/// <summary>Outcome envelope returned by every bulk assign/unassign endpoint.</summary>
public class BulkCurriculumAssignmentResultDto
{
    public int        RequestedCount { get; set; }
    public int        SucceededCount { get; set; }
    public int        SkippedCount   { get; set; }
    public List<Guid> SucceededIds   { get; set; } = new();
    public List<BulkCurriculumAssignmentErrorDto> Errors { get; set; } = new();
}

public class SchoolUnitAssignmentDto
{
    public Guid     Id             { get; set; }
    public Guid     SchoolId       { get; set; }
    public string   SchoolName     { get; set; } = null!;
    public Guid     UnitId         { get; set; }
    public string   UnitName       { get; set; } = null!;
    public string?  UnitCode       { get; set; }
    public Guid     AssignedBy     { get; set; }
    public string?  AssignedByName { get; set; }
    public DateTime AssignedDate   { get; set; }
    public string?  Notes          { get; set; }
}

public class SchoolTopicAssignmentDto
{
    public Guid     Id             { get; set; }
    public Guid     SchoolId       { get; set; }
    public string   SchoolName     { get; set; } = null!;
    public Guid     TopicId        { get; set; }
    public string   TopicName      { get; set; } = null!;
    public string?  TopicCode      { get; set; }
    public Guid     UnitId         { get; set; }
    public string   UnitName       { get; set; } = null!;
    public Guid     AssignedBy     { get; set; }
    public string?  AssignedByName { get; set; }
    public DateTime AssignedDate   { get; set; }
    public string?  Notes          { get; set; }
}

/// <summary>
/// Catalog row combining a master Unit/Topic with its assignment status for ONE
/// specific School in context — backs the Admin "School Curriculum Assignment"
/// screen (Requirement 7.1), which lists all master content with a flag for
/// whether it is currently assigned to the selected School, supports search by
/// name/code and bulk assign/remove from the same grid.
/// </summary>
public class SchoolCurriculumCatalogItemDto
{
    public Guid      Id                 { get; set; }
    /// <summary>"Unit" or "Topic".</summary>
    public string    EntityType         { get; set; } = null!;
    public string    Name               { get; set; } = null!;
    public string?   Code               { get; set; }
    public Guid?     ParentUnitId       { get; set; }
    public string?   ParentUnitName     { get; set; }
    /// <summary>School-agnostic master grade level (1st..10th Grade) this Unit/Topic belongs to.</summary>
    public Guid?     GradeLevelId       { get; set; }
    public string?   GradeLevelName     { get; set; }
    public Guid?     SubjectId          { get; set; }
    public string?   SubjectName        { get; set; }
    public bool      IsActive           { get; set; }
    public bool      IsAssignedToSchool { get; set; }
    public DateTime? AssignedDate       { get; set; }
}

/// <summary>Query/filter parameters for browsing the curriculum catalog scoped to a School.</summary>
public class SchoolCurriculumCatalogQueryDto : PagedRequest
{
    public Guid    SchoolId     { get; set; }
    /// <summary>"Unit", "Topic", or null for both.</summary>
    public string? EntityType   { get; set; }
    public Guid?   UnitId       { get; set; }
    /// <summary>Filter to only assigned (true), only unassigned (false), or all (null).</summary>
    public bool?   AssignedOnly { get; set; }
}

public class CurriculumAssignmentAuditLogDto
{
    public Guid     Id              { get; set; }
    public Guid     SchoolId        { get; set; }
    public string   SchoolName      { get; set; } = null!;
    public string   EntityType      { get; set; } = null!;
    public Guid     EntityId        { get; set; }
    public string   EntityName      { get; set; } = null!;
    public string   ActionPerformed { get; set; } = null!;
    public Guid     PerformedBy     { get; set; }
    public string   UserName        { get; set; } = null!;
    public string   Role            { get; set; } = null!;
    public DateTime DateTime        { get; set; }
    public string?  Notes           { get; set; }
}

/// <summary>Query/filter parameters for the assignment-history (audit log) view.</summary>
public class CurriculumAssignmentAuditLogQueryDto : PagedRequest
{
    public Guid?     SchoolId   { get; set; }
    public string?   EntityType { get; set; }
    public Guid?     EntityId   { get; set; }
    public DateTime? FromDate   { get; set; }
    public DateTime? ToDate     { get; set; }
}

/// <summary>
/// Per-School curriculum dashboard summary (Requirement 7.3): assigned unit/topic
/// counts plus teacher/student counts for the School in context.
/// </summary>
public class SchoolCurriculumDashboardDto
{
    public Guid      SchoolId           { get; set; }
    public string    SchoolName         { get; set; } = null!;
    public int       AssignedUnitCount  { get; set; }
    public int       AssignedTopicCount { get; set; }
    public int       TeacherCount       { get; set; }
    public int       StudentCount       { get; set; }
    public DateTime? LastAssignmentDate { get; set; }
}
