using Veriton.Domain.Common;

namespace Veriton.Domain.Entities;

public class LessonCompletion : BaseEntity, IMultiTenant
{
    public Guid SchoolId { get; set; }
    public Guid StudentId { get; set; }
    public Guid LessonId { get; set; }
    public DateTime CompletionDate { get; set; }

    // Navigation Properties
    public Student Student { get; set; } = null!;
    public Lesson Lesson { get; set; } = null!;
}
