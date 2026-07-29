namespace NubeEra.Application.DTOs;

// ── Sub-DTOs ──────────────────────────────────────────────────────────────────

public class ReportCardSubjectDto
{
    public string Id { get; set; } = null!;
    public string SubjectName { get; set; } = null!;
    public int MaxMarks { get; set; }
    public decimal ObtainedMarks { get; set; }
    public string? Grade { get; set; }
    public string? Remarks { get; set; }
    public int SortOrder { get; set; }
}

public class ReportCardSubjectInputDto
{
    public string SubjectName { get; set; } = null!;
    public int MaxMarks { get; set; }
    public decimal ObtainedMarks { get; set; }
    public string? Remarks { get; set; }
    public int SortOrder { get; set; }
}

public class ReportCardActivityDto
{
    public string ActivityName { get; set; } = null!;
    public string? Rating { get; set; }
    public string? Remarks { get; set; }
    public int SortOrder { get; set; }
}

public class ReportCardSkillDto
{
    public string SkillName { get; set; } = null!;
    public int Rating { get; set; }
    public string? Remarks { get; set; }
    public int SortOrder { get; set; }
}

// ── Grading Rules ─────────────────────────────────────────────────────────────

public class ReportCardGradingRuleDto
{
    public string Id { get; set; } = null!;
    public string? SchoolId { get; set; }
    public decimal MinPercentage { get; set; }
    public decimal MaxPercentage { get; set; }
    public string GradeLetter { get; set; } = null!;
    public decimal? GpaValue { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; }
    public int SortOrder { get; set; }
}

public class UpsertGradingRuleDto
{
    public decimal MinPercentage { get; set; }
    public decimal MaxPercentage { get; set; }
    public string GradeLetter { get; set; } = null!;
    public decimal? GpaValue { get; set; }
    public string? Description { get; set; }
    public int SortOrder { get; set; }
}

// ── Create / Generate ─────────────────────────────────────────────────────────

public class GenerateReportCardDto
{
    public string SchoolId { get; set; } = null!;
    public string StudentId { get; set; } = null!;
    public string GradeId { get; set; } = null!;
    public string AcademicYear { get; set; } = null!;
    public string ExamType { get; set; } = null!;   // Unit Test | Mid-Term | Final Exam | Annual Exam
    public string? ExamName { get; set; }
    public DateTime? ExamDate { get; set; }
    public string? Section { get; set; }

    // Attendance
    public int? TotalWorkingDays { get; set; }
    public int? DaysPresent { get; set; }
    public int? DaysAbsent { get; set; }

    // Remarks
    public string? TeacherRemarks { get; set; }
    public string? PrincipalRemarks { get; set; }

    // Subjects
    public List<ReportCardSubjectInputDto> Subjects { get; set; } = new();

    // Activities
    public List<ReportCardActivityDto> Activities { get; set; } = new();

    // Skills
    public List<ReportCardSkillDto> Skills { get; set; } = new();
}

public class BulkGenerateReportCardDto
{
    public string SchoolId { get; set; } = null!;
    public string GradeId { get; set; } = null!;
    public string AcademicYear { get; set; } = null!;
    public string ExamType { get; set; } = null!;
    public string? ExamName { get; set; }
    public DateTime? ExamDate { get; set; }
    public string? Section { get; set; }
    public string? TeacherRemarks { get; set; }
    public string? PrincipalRemarks { get; set; }
    // Per-student data keyed by studentId
    public List<StudentReportInputDto> Students { get; set; } = new();
}

public class StudentReportInputDto
{
    public string StudentId { get; set; } = null!;
    public int? TotalWorkingDays { get; set; }
    public int? DaysPresent { get; set; }
    public int? DaysAbsent { get; set; }
    public string? TeacherRemarks { get; set; }
    public List<ReportCardSubjectInputDto> Subjects { get; set; } = new();
    public List<ReportCardActivityDto> Activities { get; set; } = new();
    public List<ReportCardSkillDto> Skills { get; set; } = new();
}

// ── Update ────────────────────────────────────────────────────────────────────

public class UpdateReportCardDto
{
    public string? ExamName { get; set; }
    public DateTime? ExamDate { get; set; }
    public string? Section { get; set; }
    public int? TotalWorkingDays { get; set; }
    public int? DaysPresent { get; set; }
    public int? DaysAbsent { get; set; }
    public string? TeacherRemarks { get; set; }
    public string? PrincipalRemarks { get; set; }
    public List<ReportCardSubjectInputDto>? Subjects { get; set; }
    public List<ReportCardActivityDto>? Activities { get; set; }
    public List<ReportCardSkillDto>? Skills { get; set; }
}

// ── Publish ───────────────────────────────────────────────────────────────────

public class PublishReportCardDto
{
    public bool IsVisibleToStudent { get; set; } = true;
    public bool IsVisibleToParent { get; set; } = true;
}

// ── Response DTOs ─────────────────────────────────────────────────────────────

public class ReportCardListItemDto
{
    public string Id { get; set; } = null!;
    public string ReportCardNumber { get; set; } = null!;
    public string StudentName { get; set; } = null!;
    public string StudentIdNumber { get; set; } = null!;
    public string? RollNo { get; set; }
    public string GradeName { get; set; } = null!;
    public string? Section { get; set; }
    public string SchoolName { get; set; } = null!;
    public string AcademicYear { get; set; } = null!;
    public string ExamType { get; set; } = null!;
    public string? ExamName { get; set; }
    public decimal Percentage { get; set; }
    public string? OverallGrade { get; set; }
    public bool IsPassed { get; set; }
    public string Status { get; set; } = null!;
    public bool IsVisibleToStudent { get; set; }
    public bool IsVisibleToParent { get; set; }
    public DateTime? PublishedAt { get; set; }
    public int DownloadCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ReportCardDto
{
    public string Id { get; set; } = null!;
    public string ReportCardNumber { get; set; } = null!;
    public string SchoolId { get; set; } = null!;
    public string StudentId { get; set; } = null!;
    public string GradeId { get; set; } = null!;
    public string AcademicYear { get; set; } = null!;
    public string ExamType { get; set; } = null!;
    public string? ExamName { get; set; }
    public DateTime? ExamDate { get; set; }

    // Student snapshot
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

    // Performance
    public decimal TotalMarks { get; set; }
    public decimal ObtainedMarks { get; set; }
    public decimal Percentage { get; set; }
    public string? OverallGrade { get; set; }
    public decimal? GPA { get; set; }
    public int? Rank { get; set; }
    public bool IsPassed { get; set; }

    // Attendance
    public int? TotalWorkingDays { get; set; }
    public int? DaysPresent { get; set; }
    public int? DaysAbsent { get; set; }
    public decimal? AttendancePercentage { get; set; }

    // Remarks
    public string? TeacherRemarks { get; set; }
    public string? PrincipalRemarks { get; set; }

    // Status / workflow
    public string Status { get; set; } = null!;
    public bool IsVisibleToStudent { get; set; }
    public bool IsVisibleToParent { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime? PublishedAt { get; set; }

    // Verification
    public string? QrCodeData { get; set; }
    public int DownloadCount { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Collections
    public List<ReportCardSubjectDto> Subjects { get; set; } = new();
    public List<ReportCardActivityDto> Activities { get; set; } = new();
    public List<ReportCardSkillDto> Skills { get; set; } = new();
}

public class BulkGenerateResultDto
{
    public int Generated { get; set; }
    public int Skipped { get; set; }
    public List<string> Errors { get; set; } = new();
}
