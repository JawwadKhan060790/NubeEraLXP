using Veriton.Domain.Common;

namespace Veriton.Domain.Entities;

public class Grade : BaseEntity
{
    public Guid? SchoolId { get; set; }

    // Authoritative master-data link (Task: grade structure normalization).
    // Nullable for backward compatibility with legacy rows until the data
    // migration backfill runs; new writes should always populate this. 

    // Denormalized cache columns kept in sync (at write-time, by GradeService)
    // with GradeLevelId/Level so existing reads, sorts, and the unique index
    // below keep working unchanged. Do NOT write these independently of
    // GradeLevelId going forward — treat them as derived/cache fields.
    public string GradeLevel { get; set; } = null!; // "1", "2", ... "10"
    public string GradeName { get; set; } = null!; // "Grade 1 - A"
    public int Capacity { get; set; }
    public Guid? ClassTeacherId { get; set; }
    public string? ClassRoom { get; set; }
    public string? AcademicYear { get; set; } // "2024-2025"
    public bool IsActive { get; set; } = true;

    // Navigation Properties
    public School? School { get; set; }
    public GradeLevel? Level { get; set; }
    public Teacher? ClassTeacher { get; set; }
    public ICollection<Student> Students { get; set; } = new List<Student>();
    // Module no longer references Grade directly — Units are written at the master
    // GradeLevel instead (see GradeLevel.Modules) and reach a school only via
    // SchoolUnitAssignment (/admin/curriculum-assignment).
    public ICollection<Scheduler> Schedules { get; set; } = new List<Scheduler>();
    public ICollection<Exam> Exams { get; set; } = new List<Exam>(); 
    public Guid? GradeLevelId { get; set; }
}
