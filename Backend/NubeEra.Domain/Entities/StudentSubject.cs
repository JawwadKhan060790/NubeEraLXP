using System;
using NubeEra.Domain.Common;

namespace NubeEra.Domain.Entities;

/// <summary>
/// Many-to-many join between Student and Subject.
/// </summary>
public class StudentSubject : BaseEntity
{
    public Guid StudentId { get; set; }
    public Guid SubjectId { get; set; }

    // Navigation properties
    public Student Student { get; set; } = null!;
    public Subject Subject { get; set; } = null!;
}
