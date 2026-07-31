using Veriton.Domain.Common;

namespace Veriton.Domain.Entities;

public class Result : BaseEntity, IMultiTenant
{
    public Guid SchoolId { get; set; }
    public Guid StudentId { get; set; }
    public Guid ExamId { get; set; }
    public decimal ObtainedMarks { get; set; }
    public string? Grade { get; set; } // "A", "B", etc.
    public string? Remarks { get; set; }
    public bool IsPublished { get; set; } = false;

    // Navigation Properties
    public School School { get; set; } = null!;
    public Student Student { get; set; } = null!;
    public Exam Exam { get; set; } = null!;
}
