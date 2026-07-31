using Veriton.Domain.Common;

namespace Veriton.Domain.Entities;

public enum AttendanceStatus
{
    Present,
    Absent,
    Late,
    Excused
}

public class Attendance : BaseEntity, IMultiTenant
{
    public Guid SchoolId { get; set; }
    public DateTime Date { get; set; }
    public AttendanceStatus Status { get; set; }
    public string? Remarks { get; set; }

    // Navigation Properties
    public Guid? TeacherId { get; set; }
    public Teacher? Teacher { get; set; }

    public Guid? StudentId { get; set; }
    public Student? Student { get; set; }
}
