using System;
using NubeEra.Domain.Common;

namespace NubeEra.Domain.Entities;

public class StudentPythonCode : BaseEntity, IMultiTenant
{
    public Guid SchoolId { get; set; }
    public Guid StudentId { get; set; }
    public Guid LessonId { get; set; }
    public Guid CourseId { get; set; } // maps to ModuleId
    public string PythonCode { get; set; } = string.Empty;
    public DateTime LastModifiedDate { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public Student Student { get; set; } = null!;
    public Lesson Lesson { get; set; } = null!;
}
