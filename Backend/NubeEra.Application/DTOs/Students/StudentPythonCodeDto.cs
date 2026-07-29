using System;

namespace NubeEra.Application.DTOs;

public class StudentPythonCodeDto
{
    public Guid LessonId { get; set; }
    public Guid CourseId { get; set; } // maps to ModuleId
    public Guid StudentId { get; set; }
    public string PythonCode { get; set; } = string.Empty;
    public DateTime LastModifiedDate { get; set; }
}

public class StudentPythonCodeSaveDto
{
    public Guid LessonId { get; set; }
    public Guid CourseId { get; set; } // maps to ModuleId
    public string PythonCode { get; set; } = string.Empty;
}
