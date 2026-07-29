using NubeEra.Domain.Common;

namespace NubeEra.Domain.Entities;

/// <summary>
/// Represents a Subject/Module ("Unit") at a school-agnostic Grade Level, created by a
/// Teacher/Staff/Admin. Not tied to any specific school — schools gain access to a Unit
/// via <see cref="SchoolUnitAssignment"/>, assigned from /admin/curriculum-assignment.
/// Replaces the old Course-based Module hierarchy.
/// </summary>
public class Module : BaseEntity
{
    /// <summary>
    /// School-agnostic master grade level (1st..10th Grade) this Unit is written for.
    /// Units are master content shared across every school at that grade level;
    /// per-school visibility is granted separately via <see cref="SchoolUnitAssignment"/>
    /// (see /admin/curriculum-assignment).
    /// </summary>
    public Guid GradeLevelId { get; set; }
    public Guid? SubjectId { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public int Credits { get; set; }
    public Guid? CreatedByTeacherId { get; set; }
    public string? PdfFileUrl { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation Properties
    public GradeLevel GradeLevel { get; set; } = null!;
    public Subject? Subject { get; set; }
    public Teacher? CreatedByTeacher { get; set; }
    public ICollection<Lesson> Lessons { get; set; } = new List<Lesson>();
    public ICollection<Scheduler> Schedules { get; set; } = new List<Scheduler>();
    public ICollection<Exam> Exams { get; set; } = new List<Exam>();
    public ICollection<SchoolUnitAssignment> SchoolAssignments { get; set; } = new List<SchoolUnitAssignment>();
}
