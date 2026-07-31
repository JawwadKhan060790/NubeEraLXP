namespace Veriton.Application.DTOs;

public class StudentProgressDto
{
    public Guid StudentId { get; set; }
    public string StudentName { get; set; } = null!;
    public int CompletedLessons { get; set; }
    public int TotalLessons { get; set; }
    public double ProgressPercentage => TotalLessons == 0 ? 0 : Math.Round((double)CompletedLessons / TotalLessons * 100, 2);
}
