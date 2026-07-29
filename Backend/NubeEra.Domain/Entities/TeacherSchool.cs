using NubeEra.Domain.Common;

namespace NubeEra.Domain.Entities;

/// <summary>
/// Many-to-many join between Teacher and School, enabling a single Teacher to belong
/// to multiple Schools. Distinct from <see cref="Teacher.SchoolId"/>, which remains the
/// Teacher's single "home"/primary school (used for JWT embedding, backward-compat
/// reporting, and any not-yet-migrated code path that still expects exactly one school).
///
/// IsActive is an explicit business-status toggle (Active/Inactive) that is SEPARATE
/// from soft delete: a school can temporarily deactivate a teacher's access (e.g. leave
/// of absence) without losing the historical assignment record. Soft delete (IsDeleted)
/// is reserved for fully retracting an assignment that should no longer exist at all
/// (e.g. assigned in error). Every status change and assign/unassign is mirrored into
/// <see cref="TeacherSchoolAuditLog"/> for the Teacher School Assignment history UI.
/// </summary>
public class TeacherSchool : BaseEntity
{
    public Guid TeacherId { get; set; }
    public Guid SchoolId { get; set; }

    /// <summary>Active/Inactive business status — see class summary.</summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Marks this row as the Teacher's primary/home school. Exactly one TeacherSchool
    /// row per Teacher should have IsPrimary = true; enforced in TeacherSchoolService,
    /// kept in sync with Teacher.SchoolId.
    /// </summary>
    public bool IsPrimary { get; set; }

    /// <summary>Id of the Admin/Principal user who performed the (most recent) assignment.</summary>
    public Guid AssignedBy { get; set; }

    /// <summary>UTC timestamp of the (most recent) assignment.</summary>
    public DateTime AssignedDate { get; set; }

    /// <summary>Optional free-text reason/comment captured at assignment time.</summary>
    public string? Notes { get; set; }

    // Navigation properties
    public Teacher Teacher { get; set; } = null!;
    public School School { get; set; } = null!;
}
