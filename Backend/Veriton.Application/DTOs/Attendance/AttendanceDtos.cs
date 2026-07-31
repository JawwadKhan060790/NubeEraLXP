namespace Veriton.Application.DTOs;

public class AttendanceDto
{
    public Guid Id { get; set; }
    public DateTime Date { get; set; }
    public string Status { get; set; } = null!;
    public string? Remarks { get; set; }
    public Guid? TeacherId { get; set; }
    public string? TeacherName { get; set; }
    public Guid? StudentId { get; set; }
    public string? StudentName { get; set; }
}

public class TeacherAttendanceReportDto
{
    public string Month { get; set; } = null!;
    public int PresentDays { get; set; }
    public int AbsentDays { get; set; }
    public int LateDays { get; set; }
    public List<AttendanceRecordDto> Records { get; set; } = new();
}

public class AttendanceRecordDto
{
    public DateTime Date { get; set; }
    public string Status { get; set; } = null!;
    public string? Remarks { get; set; }
}
