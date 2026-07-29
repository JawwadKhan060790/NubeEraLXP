using System;
using NubeEra.Domain.Common;

namespace NubeEra.Domain.Entities;

/// <summary>
/// Many-to-many join between Teacher and Subject.
/// </summary>
public class TeacherSubject : BaseEntity
{
    public Guid TeacherId { get; set; }
    public Guid SubjectId { get; set; }

    // Navigation properties
    public Teacher Teacher { get; set; } = null!;
    public Subject Subject { get; set; } = null!;
}
