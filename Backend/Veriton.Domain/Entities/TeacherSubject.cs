using System;
using Veriton.Domain.Common;

namespace Veriton.Domain.Entities;

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
