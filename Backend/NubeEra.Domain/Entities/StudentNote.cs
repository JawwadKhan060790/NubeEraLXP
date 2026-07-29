using NubeEra.Domain.Common;

namespace NubeEra.Domain.Entities;

public class StudentNote : BaseEntity, IMultiTenant
{
    public Guid SchoolId { get; set; }
    public Guid StudentId { get; set; }
    public Guid LessonId { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public Student Student { get; set; } = null!;
    public Lesson Lesson { get; set; } = null!;
}
