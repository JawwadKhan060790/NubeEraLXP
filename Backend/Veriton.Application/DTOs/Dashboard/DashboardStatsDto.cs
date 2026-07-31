namespace Veriton.Application.DTOs;

public class DashboardStatsDto
{
    // Core counts
    public int TotalStudents { get; set; }
    public int TotalTeachers { get; set; }
    public int TotalModules { get; set; }
    public int TotalLessons { get; set; }
    public int TotalExams { get; set; }
    public int TotalResults { get; set; }

    // School & Grade counts
    public int TotalSchools { get; set; }
    public int TotalGrades { get; set; }

    // Principal counts
    public int TotalPrincipals { get; set; }
    public int TotalPrincipalsPending { get; set; }

    // Pending counts
    public int TotalTeachersPending { get; set; }
    public int TotalStudentsPending { get; set; }

    // Chart Data
    public List<StudentProgressStatDto> StudentProgress { get; set; } = new();
    public List<GradeAttendanceStatDto> GradeAttendance { get; set; } = new();
    public List<TeacherStatDto> TeacherStats { get; set; } = new();
}

public class StudentProgressStatDto
{
    public string Name { get; set; } = null!;
    public double Progress { get; set; }
}

public class GradeAttendanceStatDto
{
    public string Grade { get; set; } = null!;
    public double Attendance { get; set; }
}

public class TeacherStatDto
{
    public string Name { get; set; } = null!;
    public double Value { get; set; }
}
