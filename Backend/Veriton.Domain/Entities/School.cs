using Veriton.Domain.Common;

namespace Veriton.Domain.Entities;

public class School : BaseEntity
{
    public string SchoolCode { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? LogoUrl { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }
    public string? ContactEmail { get; set; }
    public string? ContactPhone { get; set; }
    public string? PrincipalName { get; set; }
    public string? PrincipalEmail { get; set; }
    public string? PrincipalPhone { get; set; }
    public DateTime? EstablishedDate { get; set; }
    public string? Website { get; set; }
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Lower bound of the standardized grade range (1st-10th) this school supports.
    /// References the system-defined GradeLevel master. Required for activation.
    /// </summary>
    public Guid? FromGradeId { get; set; }

    /// <summary>
    /// Upper bound of the standardized grade range (1st-10th) this school supports.
    /// References the system-defined GradeLevel master. Required for activation.
    /// </summary>
    public Guid? ToGradeId { get; set; }

    // Navigation Properties
    public GradeLevel? FromGrade { get; set; }
    public GradeLevel? ToGrade { get; set; }
    public ICollection<Grade> Grades { get; set; } = new List<Grade>();
    public ICollection<Teacher> Teachers { get; set; } = new List<Teacher>();
    public ICollection<Student> Students { get; set; } = new List<Student>();
    // Note: Module ("Unit") no longer belongs to a School directly — Units are master
    // content shared across all schools at a grade level; see SchoolUnitAssignment.
    // ── Geolocation ────────────────────────────────────────────────────────────────
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }

    // ── School-Based Curriculum Assignment / Multi-School Teacher Management ────────
    public ICollection<SchoolUnitAssignment> SchoolUnitAssignments { get; set; } = new List<SchoolUnitAssignment>();
    public ICollection<SchoolTopicAssignment> SchoolTopicAssignments { get; set; } = new List<SchoolTopicAssignment>();
    public ICollection<TeacherSchool> TeacherSchools { get; set; } = new List<TeacherSchool>();
}
