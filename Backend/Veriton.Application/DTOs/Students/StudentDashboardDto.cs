using System;
using System.Collections.Generic;

namespace Veriton.Application.DTOs;

public class StudentDashboardDto
{
    public Guid Id { get; set; }
    public string StudentName { get; set; } = null!;
    public string GradeName { get; set; } = null!;
    public string SchoolName { get; set; } = null!;
    public string? SectionCode { get; set; }
    public string? SectionName { get; set; }
    public string? StudentId { get; set; }
    public string? RollNo { get; set; }
    public Guid? GradeId { get; set; }
    
    // Counters
    public int TotalModules { get; set; }
    public int CompletedLessons { get; set; }
    public int PendingLessons { get; set; }
    public double SyllabusCompletionPercentage { get; set; }
    public int TotalExams { get; set; }
    public double AverageExamScore { get; set; }
    
    // Topic-wise progress throughout the year (completed vs pending)
    public List<StudentModuleProgressDto> ModulesProgress { get; set; } = new();
    
    // Recent Completed Lessons
    public List<RecentCompletionDto> RecentCompletions { get; set; } = new();

    // Failed unit tests to highlight weak areas
    public List<FailedUnitDto> FailedUnits { get; set; } = new();

    // Passed unit tests to highlight strength areas
    public List<PassedUnitDto> PassedUnits { get; set; } = new();

    // Results of all completed exams
    public List<ExamResultDto> ExamResults { get; set; } = new();
}

public class StudentModuleProgressDto
{
    public Guid ModuleId { get; set; }
    public string ModuleName { get; set; } = null!;
    public int TotalLessons { get; set; }
    public int CompletedLessons { get; set; }
    public int PendingLessons { get; set; }
    public double CompletionPercentage { get; set; }
}

public class RecentCompletionDto
{
    public string LessonName { get; set; } = null!;
    public string ModuleName { get; set; } = null!;
    public DateTime CompletedAt { get; set; }
}

public class FailedUnitDto
{
    public Guid ModuleId { get; set; }
    public string ModuleName { get; set; } = null!;
    public Guid? LessonId { get; set; }
    public string? LessonName { get; set; }
    public string ExamTitle { get; set; } = null!;
    public decimal ObtainedMarks { get; set; }
    public decimal TotalMarks { get; set; }
    public decimal PassingMarks { get; set; }
}

public class PassedUnitDto
{
    public Guid ModuleId { get; set; }
    public string ModuleName { get; set; } = null!;
    public Guid? LessonId { get; set; }
    public string? LessonName { get; set; }
    public string ExamTitle { get; set; } = null!;
    public decimal ObtainedMarks { get; set; }
    public decimal TotalMarks { get; set; }
    public decimal PassingMarks { get; set; }
}

public class ExamResultDto
{
    public Guid ExamId { get; set; }
    public decimal ObtainedMarks { get; set; }
    public decimal PassingMarks { get; set; }
    public bool IsPassed { get; set; }
}
