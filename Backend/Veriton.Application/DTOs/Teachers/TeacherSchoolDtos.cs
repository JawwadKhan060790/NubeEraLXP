using Veriton.Application.Common.Models;

namespace Veriton.Application.DTOs;

// ── Teacher-School Assignment DTOs ──────────────────────────────────────────
// Backs Requirement 2 (Multi-School Teacher Assignment), Requirement 3
// (school-specific Teacher access / school switching) and Requirement 7.2
// (Admin Teacher-School Assignment screen).

/// <summary>
/// Used by the Teacher Create/Edit screen's multi-school selector: the full set
/// of School memberships to apply for a Teacher in one call. The service layer
/// diffs this against existing TeacherSchool rows — adding new ones, restoring
/// previously soft-deleted ones, and leaving untouched anything not present here.
/// Removing a School from a Teacher is a separate explicit action
/// (<see cref="RemoveTeacherSchoolDto"/>), never inferred from omission, so this
/// DTO is safe even if the caller only has a partial view of current memberships.
/// </summary>
public class TeacherSchoolAssignmentSetDto
{
    public Guid       TeacherId       { get; set; }
    public List<Guid> SchoolIds       { get; set; } = new();
    public Guid?      PrimarySchoolId { get; set; }
    public string?    Notes           { get; set; }
}

/// <summary>Assign (or re-assign) a Teacher to one or more additional Schools.</summary>
public class AssignTeacherToSchoolsDto
{
    public Guid       TeacherId { get; set; }
    public List<Guid> SchoolIds { get; set; } = new();
    public string?    Notes     { get; set; }
}

/// <summary>Unassign (soft delete) a single Teacher-School membership.</summary>
public class RemoveTeacherSchoolDto
{
    public Guid    TeacherId { get; set; }
    public Guid    SchoolId  { get; set; }
    public string? Notes     { get; set; }
}

/// <summary>Toggle a Teacher-School membership's Active/Inactive business status.</summary>
public class UpdateTeacherSchoolStatusDto
{
    public bool    IsActive { get; set; }
    public string? Notes    { get; set; }
}

/// <summary>Mark one of a Teacher's Schools as their primary/home school.</summary>
public class SetPrimaryTeacherSchoolDto
{
    public Guid TeacherId { get; set; }
    public Guid SchoolId  { get; set; }
}

public class TeacherSchoolDto
{
    public Guid     Id             { get; set; }
    public Guid     TeacherId      { get; set; }
    public string   TeacherName    { get; set; } = null!;
    public Guid     SchoolId       { get; set; }
    public string   SchoolName     { get; set; } = null!;
    public bool     IsActive       { get; set; }
    public bool     IsPrimary      { get; set; }
    public Guid     AssignedBy     { get; set; }
    public string?  AssignedByName { get; set; }
    public DateTime AssignedDate   { get; set; }
    public string?  Notes          { get; set; }
}

/// <summary>
/// One row per active School a Teacher belongs to — backs the post-login
/// school-switcher (Requirement 3): "show only assigned Schools; allow switching
/// between schools if multiple".
/// </summary>
public class TeacherAvailableSchoolDto
{
    public Guid   SchoolId   { get; set; }
    public string SchoolName { get; set; } = null!;
    public bool   IsPrimary  { get; set; }
    public bool   IsActive   { get; set; }
}

public class TeacherSchoolQueryDto : PagedRequest
{
    public Guid? TeacherId { get; set; }
    public Guid? SchoolId  { get; set; }
    public bool? IsActive  { get; set; }
}

public class TeacherSchoolAuditLogDto
{
    public Guid     Id              { get; set; }
    public Guid     TeacherId       { get; set; }
    public string   TeacherName     { get; set; } = null!;
    public Guid     SchoolId        { get; set; }
    public string   SchoolName      { get; set; } = null!;
    public string   ActionPerformed { get; set; } = null!;
    public Guid     PerformedBy     { get; set; }
    public string   UserName        { get; set; } = null!;
    public string   Role            { get; set; } = null!;
    public DateTime DateTime        { get; set; }
    public string?  Notes           { get; set; }
}

public class TeacherSchoolAuditLogQueryDto : PagedRequest
{
    public Guid?     TeacherId { get; set; }
    public Guid?     SchoolId  { get; set; }
    public DateTime? FromDate  { get; set; }
    public DateTime? ToDate    { get; set; }
}

/// <summary>One failed item inside a bulk Teacher-School assign request.</summary>
public class TeacherSchoolBulkErrorDto
{
    public Guid   Id     { get; set; }
    public string Reason { get; set; } = null!;
}

/// <summary>Outcome envelope returned by <see cref="AssignTeacherToSchoolsDto"/> bulk assignment.</summary>
public class TeacherSchoolBulkResultDto
{
    public int        RequestedCount { get; set; }
    public int        SucceededCount { get; set; }
    public int        SkippedCount   { get; set; }
    public List<Guid> SucceededIds   { get; set; } = new();
    public List<TeacherSchoolBulkErrorDto> Errors { get; set; } = new();
}
