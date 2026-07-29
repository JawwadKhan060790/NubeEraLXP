namespace NubeEra.Application.DTOs;

/// <summary>Submitted by a Student to rate (or re-rate) one of their Teachers.</summary>
public class SubmitTeacherRatingDto
{
    public Guid TeacherId { get; set; }

    /// <summary>1 (lowest) to 5 (highest) stars.</summary>
    public int Rating { get; set; }
    public string? Comment { get; set; }
}

/// <summary>A single Teacher rating, as stored.</summary>
public class TeacherRatingDto
{
    public Guid Id { get; set; }
    public Guid TeacherId { get; set; }
    public string TeacherName { get; set; } = "";
    public int Rating { get; set; }
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedDate { get; set; }
}

/// <summary>A Teacher the logged-in Student is allowed to rate, with their existing rating (if any).</summary>
public class RatableTeacherDto
{
    public Guid TeacherId { get; set; }
    public string TeacherName { get; set; } = "";
    public string? Subject { get; set; }
    public bool IsClassTeacher { get; set; }

    /// <summary>Null if the student hasn't rated this teacher yet.</summary>
    public int? MyRating { get; set; }
    public string? MyComment { get; set; }
}
