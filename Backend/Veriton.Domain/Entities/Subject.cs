using System;
using System.Collections.Generic;
using Veriton.Domain.Common;

namespace Veriton.Domain.Entities;

/// <summary>
/// Represents a Subject (e.g. Mathematics, Science) taught at a specific master Grade Level.
/// Subjects contain master Units (Modules) and Topics (Lessons).
/// </summary>
public class Subject : BaseEntity
{
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public Guid GradeLevelId { get; set; }
    public bool IsActive { get; set; } = true;
    public Guid? CreatedByTeacherId { get; set; }

    // Navigation Properties
    public GradeLevel GradeLevel { get; set; } = null!;
    public Teacher? CreatedByTeacher { get; set; }
    public ICollection<Module> Modules { get; set; } = new List<Module>();
    public ICollection<TeacherSubject> TeacherSubjects { get; set; } = new List<TeacherSubject>();
    public ICollection<StudentSubject> StudentSubjects { get; set; } = new List<StudentSubject>();
}
