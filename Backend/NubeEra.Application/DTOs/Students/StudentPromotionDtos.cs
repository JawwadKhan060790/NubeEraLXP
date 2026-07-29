using System;

namespace NubeEra.Application.DTOs;

/// <summary>
/// Request body for promoting/transferring a single student to a new grade
/// (and, optionally, a new school).
///
/// SCOPE NOTE: this intentionally covers only the single-student case with a
/// best-effort notification and a console/audit-log record of the action. The
/// QA report's documented gap ("Student promotion / grade transfer") called for
/// a full feature — bulk promotion, a persisted audit trail with rollback, and
/// stakeholder-defined business rules — which is correctly scoped as its own
/// initiative requiring a schema migration (a dedicated history table) and
/// product sign-off. This minimal slice delivers the core, safe operation
/// (validated grade/school move + notification) without those larger
/// commitments, and can be extended into the bulk/audited version later by
/// adding a StudentPromotionHistory entity (modeled on the existing
/// TicketHistory pattern: StudentId, FromGradeId, ToGradeId, FromSchoolId,
/// ToSchoolId, PromotedByUserId, PromotedAt, Reason) behind a migration.
/// </summary>
public class StudentPromotionRequestDto
{
    /// <summary>Target grade the student is being promoted/transferred into. Required.</summary>
    public Guid ToGradeId { get; set; }

    /// <summary>
    /// Optional target school for a cross-school transfer. If omitted, the student's
    /// current school is preserved and only the grade changes (the common "promotion"
    /// case at year-end). If provided, the target grade must belong to that school.
    /// </summary>
    public Guid? ToSchoolId { get; set; }

    /// <summary>Optional human-readable reason, surfaced in the notification and audit log line.</summary>
    public string? Reason { get; set; }
}
