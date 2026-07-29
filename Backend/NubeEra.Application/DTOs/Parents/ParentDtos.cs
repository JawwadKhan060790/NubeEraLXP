using System;
using System.Collections.Generic;

namespace NubeEra.Application.DTOs;

public class ParentDashboardDto
{
    public List<ParentChildProgressDto> Children { get; set; } = new();
}

public class ParentChildProgressDto
{
    public Guid Id { get; set; }
    public string StudentId { get; set; } = null!;
    public string FirstName { get; set; } = null!;
    public string LastName { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public string GradeName { get; set; } = null!;
    public string SchoolName { get; set; } = null!;
    public string? SectionCode { get; set; }
    public string? SectionName { get; set; }
    public double ProgressPercentage { get; set; }
    public int CompletedLessonsCount { get; set; }
    public int TotalLessonsCount { get; set; }
    public List<ParentModuleProgressDto> Modules { get; set; } = new();
    public List<FailedUnitDto> FailedUnits { get; set; } = new();
}

public class ParentModuleProgressDto
{
    public Guid ModuleId { get; set; }
    public string ModuleName { get; set; } = null!;
    public int CompletedLessonsCount { get; set; }
    public int TotalLessonsCount { get; set; }
    public double ProgressPercentage { get; set; }
}
