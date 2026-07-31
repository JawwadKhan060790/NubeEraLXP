namespace Veriton.Application.DTOs;

public class StudentCreateDto
{
    public Guid? SchoolId  { get; set; }
    public Guid  GradeId   { get; set; }
    public Guid? SectionId { get; set; }   // null = no section (backward compat)
    public string? StudentId { get; set; }   // auto-generated if null/empty
    public string? RollNo { get; set; }
    public string FirstName { get; set; } = null!;
    public string LastName { get; set; } = null!;
    public string? Email { get; set; }   // optional — no login account created if absent
    public string? Phone { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? BloodGroup { get; set; }
    public string? Address { get; set; }
    public DateTime? AdmissionDate { get; set; }
    public string? ParentGuardianName { get; set; }
    public string? ParentGuardianPhone { get; set; }
    public string? ParentGuardianEmail { get; set; }
    public string? EmergencyContact { get; set; }
    public string Password { get; set; } = null!;
    public string? PersonalNote { get; set; }
    public string? ParentPassword { get; set; }
}

public class StudentUpdateDto : StudentCreateDto
{
    public bool IsActive { get; set; }
}

public class StudentDto
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public Guid SchoolId { get; set; }
    public string SchoolName { get; set; } = null!;
    public Guid    GradeId     { get; set; }
    public string  GradeName   { get; set; } = null!;
    public Guid?   SectionId   { get; set; }
    public string? SectionCode { get; set; }
    public string? SectionName { get; set; }
    /// <summary>"Grade 1 - A" or "Grade 1" when no section.</summary>
    public string  GradeDisplay => SectionCode != null ? $"{GradeName} - {SectionCode}" : GradeName;
    public string? StudentId { get; set; }
    public string? RollNo { get; set; }
    public string FirstName { get; set; } = null!;
    public string LastName { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? ParentGuardianName { get; set; }
    public string? ParentGuardianPhone { get; set; }
    public string? ParentGuardianEmail { get; set; }
    public string? EmergencyContact { get; set; }
    public string? BloodGroup { get; set; }
    public string? Address { get; set; }
    public DateTime? AdmissionDate { get; set; }
    public bool IsActive { get; set; }
    public string? PersonalNote { get; set; }
    public double ProgressPercentage { get; set; }
}