using System;

namespace Veriton.Application.DTOs;

public class StudentCalendarEventDto
{
    public Guid Id { get; set; } // Either SchedulerId, ExamId, or EventId
    public string Type { get; set; } = null!; // "Class", "Exam", "Event"
    public string Title { get; set; } = null!;
    public string Description { get; set; } = null!;
    public DateTime Start { get; set; }
    public DateTime End { get; set; }
    public string Color { get; set; } = "#3B82F6";
    public string Status { get; set; } = "Scheduled"; // Class status (NotStarted, Completed), Exam status, Event status
    public string? SubjectName { get; set; } // For Class or Exam
    public string? TeacherName { get; set; } // For Class or Exam
    public string? Venue { get; set; } // For Event
}
