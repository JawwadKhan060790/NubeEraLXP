using NubeEra.Domain.Common;

namespace NubeEra.Domain.Entities;

public class Teacher : BaseEntity
{
    public Guid SchoolId { get; set; }
    public Guid UserId { get; set; }
    public string EmployeeId { get; set; } = null!;
    public string FirstName { get; set; } = null!;
    public string LastName { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public DateTime? JoiningDate { get; set; }
    public string? Qualification { get; set; }
    public string? Specialization { get; set; }
    public decimal? Salary { get; set; }
    public string? ProfilePictureUrl { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation Properties
    public School School { get; set; } = null!;
    public User User { get; set; } = null!;
    public ICollection<Grade> ClassTeacherGrades { get; set; } = new List<Grade>();
    public ICollection<Module> Modules { get; set; } = new List<Module>();
    public ICollection<TeacherSubject> TeacherSubjects { get; set; } = new List<TeacherSubject>();
    public ICollection<Lesson> Lessons { get; set; } = new List<Lesson>();
    public ICollection<Scheduler> Schedules { get; set; } = new List<Scheduler>();
    public ICollection<Exam> Exams { get; set; } = new List<Exam>();

    /// <summary>
    /// Multi-school assignments (Requirement 2). Teacher.SchoolId above remains the
    /// primary/home school for backward compatibility; the full set of schools this
    /// Teacher can access — including the home school, mirrored as IsPrimary = true —
    /// lives here. See TeacherSchoolService.
    /// </summary>
    public ICollection<TeacherSchool> TeacherSchools { get; set; } = new List<TeacherSchool>();
}
