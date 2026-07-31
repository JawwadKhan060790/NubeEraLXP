using Veriton.Domain.Common;

namespace Veriton.Domain.Entities;

/// <summary>
/// A Student's rating/feedback for one of their Teachers, submitted from the
/// Student Dashboard. One row per Student+Teacher pair — re-rating updates the
/// existing row instead of creating a duplicate.
/// </summary>
public class TeacherRating : BaseEntity
{
    public Guid SchoolId { get; set; }
    public Guid StudentId { get; set; }
    public Guid TeacherId { get; set; }
    public Guid GradeId { get; set; }

    /// <summary>1 (lowest) to 5 (highest) stars.</summary>
    public int Rating { get; set; }
    public string? Comment { get; set; }

    // Navigation Properties
    public School  School  { get; set; } = null!;
    public Student Student { get; set; } = null!;
    public Teacher Teacher { get; set; } = null!;
    public Grade   Grade   { get; set; } = null!;
}
