using System;
using System.Collections.Generic;

namespace NubeEra.Application.DTOs;

public class TeacherDashboardDto
{
    public string TeacherName { get; set; } = null!;
    public string SchoolName { get; set; } = null!;
    public string EmployeeId { get; set; } = null!;
    
    // Counters
    public int TotalStudents { get; set; }
    public int TotalModules { get; set; }
    public int TotalLessons { get; set; }
    public int TotalExams { get; set; }
    
    // Class Performance / Grade Syllabus Completion details
    public List<GradeProgressDto> GradeProgressList { get; set; } = new();
    
    // Pending items/stats
    public List<RecentActivityDto> RecentActivities { get; set; } = new();

    // Highlighted Weak Areas across all classes
    public List<WeakAreaDto> WeakAreas { get; set; } = new();
}

public class GradeProgressDto
{
    public Guid GradeId { get; set; }
    public string GradeName { get; set; } = null!;
    public int TotalStudents { get; set; }
    public double SyllabusCompletionPercentage { get; set; }
}

public class RecentActivityDto
{
    public string Description { get; set; } = null!;
    public DateTime Timestamp { get; set; }
}

public class WeakAreaDto
{
    public string GradeName { get; set; } = null!;
    public string StudentName { get; set; } = null!;
    public string ModuleName { get; set; } = null!;
    public string ExamTitle { get; set; } = null!;
    public decimal ObtainedMarks { get; set; }
    public decimal TotalMarks { get; set; }
    public decimal PassingMarks { get; set; }
}
