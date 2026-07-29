namespace NubeEra.Application.DTOs;

// ── Template DTOs ──────────────────────────────────────────────────────────────

public class CertificateTemplateDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string ProgramType { get; set; } = null!;
    public string GradeBand { get; set; } = null!;
    public string? Description { get; set; }
    public string CertificateTitle { get; set; } = null!;
    public string? Tagline { get; set; }
    public string? DefaultPrincipalName { get; set; }
    public string? DefaultDirectorName { get; set; }
    public string? DefaultStaffName { get; set; }
    public string? DefaultStaffDesignation { get; set; }
    public bool IsActive { get; set; }
    public Guid? SchoolId { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CertificateTemplateCreateDto
{
    public string Name { get; set; } = null!;
    public string ProgramType { get; set; } = null!;
    public string GradeBand { get; set; } = null!;
    public string? Description { get; set; }
    public string CertificateTitle { get; set; } = "CERTIFICATE OF ACHIEVEMENT";
    public string? Tagline { get; set; }
    public string? DefaultPrincipalName { get; set; }
    public string? DefaultDirectorName { get; set; }
    public string? DefaultStaffName { get; set; }
    public string? DefaultStaffDesignation { get; set; }
    public bool IsActive { get; set; } = true;
    public Guid? SchoolId { get; set; }
}

public class CertificateTemplateUpdateDto : CertificateTemplateCreateDto { }

// ── Certificate DTOs ───────────────────────────────────────────────────────────

public class CertificateDto
{
    public Guid Id { get; set; }
    public string CertificateNumber { get; set; } = null!;
    public string? QrCodeData { get; set; }
    public string? QrCodeBase64 { get; set; }   // base64-encoded PNG for rendering

    // Student & School
    public Guid StudentId { get; set; }
    public string StudentName { get; set; } = null!;
    public string StudentIdNumber { get; set; } = null!;
    public string GradeName { get; set; } = null!;
    public int GradeLevel { get; set; }
    public string SchoolName { get; set; } = null!;
    public string? ParentName { get; set; }

    // Program
    public string ProgramType { get; set; } = null!;
    public string CourseName { get; set; } = null!;
    public string AcademicYear { get; set; } = null!;
    public DateTime CompletionDate { get; set; }

    // Performance
    public decimal? Percentage { get; set; }
    public string? PerformanceLevel { get; set; }
    public string? Remarks { get; set; }

    // Workflow
    public string Status { get; set; } = null!;
    public bool IsApproved { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public bool IsRevoked { get; set; }
    public bool IsAvailableToStudent { get; set; }
    public DateTime? IssuedAt { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public int DownloadCount { get; set; }
    public DateTime? LastDownloadedAt { get; set; }

    // Signatures
    public string? PrincipalName { get; set; }
    public string? PrincipalDesignation { get; set; }
    public string? DirectorName { get; set; }
    public string? DirectorDesignation { get; set; }
    public string? StaffName { get; set; }
    public string? StaffDesignation { get; set; }

    // Template
    public Guid? TemplateId { get; set; }
    public string? TemplateName { get; set; }
    public string? CertificateTitle { get; set; }
    public string? Tagline { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CertificateCreateDto
{
    public Guid StudentId { get; set; }
    public Guid? TemplateId { get; set; }
    public string ProgramType { get; set; } = null!;
    public string CourseName { get; set; } = null!;
    public string AcademicYear { get; set; } = null!;
    public DateTime CompletionDate { get; set; }
    public decimal? Percentage { get; set; }
    public string? PerformanceLevel { get; set; }
    public string? Remarks { get; set; }
    public string? PrincipalName { get; set; }
    public string? PrincipalDesignation { get; set; }
    public string? DirectorName { get; set; }
    public string? DirectorDesignation { get; set; }
    public string? StaffName { get; set; }
    public string? StaffDesignation { get; set; }
    public DateTime? ExpiryDate { get; set; }
}

public class CertificateUpdateDto
{
    public string? CourseName { get; set; }
    public string? AcademicYear { get; set; }
    public DateTime? CompletionDate { get; set; }
    public decimal? Percentage { get; set; }
    public string? PerformanceLevel { get; set; }
    public string? Remarks { get; set; }
    public string? PrincipalName { get; set; }
    public string? PrincipalDesignation { get; set; }
    public string? DirectorName { get; set; }
    public string? DirectorDesignation { get; set; }
    public string? StaffName { get; set; }
    public string? StaffDesignation { get; set; }
    public Guid? TemplateId { get; set; }
    public DateTime? ExpiryDate { get; set; }
}

public class BulkCertificateCreateDto
{
    public List<Guid> StudentIds { get; set; } = new();
    public Guid? TemplateId { get; set; }
    public string ProgramType { get; set; } = null!;
    public string CourseName { get; set; } = null!;
    public string AcademicYear { get; set; } = null!;
    public DateTime CompletionDate { get; set; }
    public string? PrincipalName { get; set; }
    public string? DirectorName { get; set; }
    public string? StaffName { get; set; }
    public string? StaffDesignation { get; set; }
}

public class CertificateApproveDto
{
    public bool Approve { get; set; }                  // true = approve, false = reject
    public bool MakeAvailableToStudent { get; set; }   // auto-publish on approval
    public string? RejectionReason { get; set; }
}

public class CertificateRevokeDto
{
    public string Reason { get; set; } = null!;
}

public class CertificateListItemDto
{
    public Guid Id { get; set; }
    public string CertificateNumber { get; set; } = null!;
    public string StudentName { get; set; } = null!;
    public string StudentIdNumber { get; set; } = null!;
    public string GradeName { get; set; } = null!;
    public string SchoolName { get; set; } = null!;
    public string ProgramType { get; set; } = null!;
    public string CourseName { get; set; } = null!;
    public string AcademicYear { get; set; } = null!;
    public string Status { get; set; } = null!;
    public bool IsApproved { get; set; }
    public bool IsAvailableToStudent { get; set; }
    public bool IsRevoked { get; set; }
    public decimal? Percentage { get; set; }
    public string? PerformanceLevel { get; set; }
    public DateTime CompletionDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public int DownloadCount { get; set; }
}
