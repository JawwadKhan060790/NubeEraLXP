using Veriton.Domain.Common;

namespace Veriton.Domain.Entities;

/// <summary>
/// Represents a generated and (optionally) approved certificate for a student.
/// </summary>
public class Certificate : BaseEntity
{
    // ── Identity ────────────────────────────────────────────────────────────
    public string CertificateNumber { get; set; } = null!;   // CERT-2026-000001
    public string? QrCodeData { get; set; }                  // Verification URL

    // ── Linked Records ──────────────────────────────────────────────────────
    public Guid StudentId { get; set; }
    public Guid? TemplateId { get; set; }
    public Guid SchoolId { get; set; }
    public Guid IssuedByUserId { get; set; }   // Staff/Admin who issued
    public Guid? ApprovedByUserId { get; set; }

    // ── Student Snapshot (denormalized for archival) ─────────────────────
    public string StudentName { get; set; } = null!;
    public string StudentIdNumber { get; set; } = null!;  // e.g. STUD-001
    public string GradeName { get; set; } = null!;
    public int GradeLevel { get; set; }          // 1-10 (drives template variant)
    public string SchoolName { get; set; } = null!;
    public string? ParentName { get; set; }

    // ── Program / Course Details ────────────────────────────────────────────
    public string ProgramType { get; set; } = null!;  // "Course"|"Robotics"|"AI"|"STEM"|"Coding"|"Training"|"Workshop"|"AcademicYear"
    public string CourseName { get; set; } = null!;
    public string AcademicYear { get; set; } = null!;  // "2025-2026"
    public DateTime CompletionDate { get; set; }

    // ── Performance ─────────────────────────────────────────────────────────
    public decimal? Percentage { get; set; }
    public string? PerformanceLevel { get; set; }  // "Distinction"|"Merit"|"Pass"
    public string? Remarks { get; set; }

    // ── Workflow Status ─────────────────────────────────────────────────────
    /// <summary>Draft → PendingApproval → Approved → Issued | Revoked</summary>
    public string Status { get; set; } = "Draft";
    public bool IsApproved { get; set; } = false;
    public DateTime? ApprovedAt { get; set; }
    public bool IsRevoked { get; set; } = false;
    public string? RevokeReason { get; set; }
    public DateTime? RevokedAt { get; set; }

    // ── Availability ────────────────────────────────────────────────────────
    public bool IsAvailableToStudent { get; set; } = false;
    public DateTime? IssuedAt { get; set; }

    // ── Metadata ────────────────────────────────────────────────────────────
    public DateTime? ExpiryDate { get; set; }
    public int DownloadCount { get; set; } = 0;
    public DateTime? LastDownloadedAt { get; set; }
    public string? UpdatedByUserId { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // ── Signature Areas ──────────────────────────────────────────────────────
    public string? PrincipalName { get; set; }
    public string? PrincipalDesignation { get; set; } = "Principal";
    public string? DirectorName { get; set; }
    public string? DirectorDesignation { get; set; } = "Director";
    public string? StaffName { get; set; }
    public string? StaffDesignation { get; set; }

    // ── Navigation ──────────────────────────────────────────────────────────
    public Student Student { get; set; } = null!;
    public School School { get; set; } = null!;
    public CertificateTemplate? Template { get; set; }
}
