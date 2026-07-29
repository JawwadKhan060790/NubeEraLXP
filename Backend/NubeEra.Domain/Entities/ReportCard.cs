using NubeEra.Domain.Common;

namespace NubeEra.Domain.Entities;

/// <summary>
/// Represents a complete student report card for a specific exam / term.
/// Status lifecycle: Draft → Published → Archived
/// </summary>
public class ReportCard : BaseEntity, IMultiTenant
{
    // ── Identity ─────────────────────────────────────────────────────────────
    public Guid SchoolId { get; set; }
    public Guid StudentId { get; set; }
    public Guid GradeId { get; set; }
    public string ReportCardNumber { get; set; } = null!;  // RC-2026-000001
    public string AcademicYear { get; set; } = null!;      // "2025-2026"
    public string ExamType { get; set; } = null!;          // "Unit Test" | "Mid-Term" | "Final Exam" | "Annual Exam"
    public string? ExamName { get; set; }                  // Optional override label
    public DateTime? ExamDate { get; set; }

    // ── Student Snapshot (denormalised for historical accuracy) ───────────────
    public string StudentName { get; set; } = null!;
    public string StudentIdNumber { get; set; } = null!;
    public string? RollNo { get; set; }
    public string GradeName { get; set; } = null!;
    public string? Section { get; set; }
    public string SchoolName { get; set; } = null!;
    public string? SchoolAddress { get; set; }
    public string? SchoolLogoUrl { get; set; }
    public string? SchoolContact { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? ParentName { get; set; }
    public string? ParentContact { get; set; }

    // ── Performance Summary ───────────────────────────────────────────────────
    public decimal TotalMarks { get; set; }
    public decimal ObtainedMarks { get; set; }
    public decimal Percentage { get; set; }
    public string? OverallGrade { get; set; }  // A+, A, B+, B, C, F
    public decimal? GPA { get; set; }
    public int? Rank { get; set; }
    public bool IsPassed { get; set; }

    // ── Attendance ────────────────────────────────────────────────────────────
    public int? TotalWorkingDays { get; set; }
    public int? DaysPresent { get; set; }
    public int? DaysAbsent { get; set; }
    public decimal? AttendancePercentage { get; set; }

    // ── Remarks ───────────────────────────────────────────────────────────────
    public string? TeacherRemarks { get; set; }
    public string? PrincipalRemarks { get; set; }

    // ── Workflow / Status ─────────────────────────────────────────────────────
    public string Status { get; set; } = "Draft";  // Draft | Published | Archived
    public bool IsVisibleToStudent { get; set; } = false;
    public bool IsVisibleToParent { get; set; } = false;
    public Guid GeneratedByUserId { get; set; }
    public Guid? ApprovedByUserId { get; set; }
    public Guid? PublishedByUserId { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime? PublishedAt { get; set; }

    // ── Verification / PDF ────────────────────────────────────────────────────
    public string? QrCodeData { get; set; }
    public int DownloadCount { get; set; } = 0;
    public DateTime? LastDownloadedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedByUserId { get; set; }

    // ── Navigation ────────────────────────────────────────────────────────────
    public School School { get; set; } = null!;
    public Student Student { get; set; } = null!;
    public Grade Grade { get; set; } = null!;
    public ICollection<ReportCardSubject> Subjects { get; set; } = new List<ReportCardSubject>();
    public ICollection<ReportCardActivity> Activities { get; set; } = new List<ReportCardActivity>();
    public ICollection<ReportCardSkill> Skills { get; set; } = new List<ReportCardSkill>();
}
