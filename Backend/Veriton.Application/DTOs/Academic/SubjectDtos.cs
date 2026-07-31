using System;
using System.Collections.Generic;

namespace Veriton.Application.DTOs;

public class SubjectCreateDto
{
    public Guid GradeLevelId { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public Guid? CreatedByTeacherId { get; set; }
}

public class SubjectUpdateDto : SubjectCreateDto
{
    public bool IsActive { get; set; }
}

public class SubjectDto
{
    public Guid Id { get; set; }
    public Guid GradeLevelId { get; set; }
    public string GradeLevelName { get; set; } = "";
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public bool IsActive { get; set; }
    public Guid? CreatedByTeacherId { get; set; }
    public string CreatedByTeacherName { get; set; } = "";
    
    // Summary counts for hierarchy
    public int UnitCount { get; set; } // Count of Modules
    public int TopicCount { get; set; } // Count of Lessons
    
    // Assignment mapping lists
    public List<Guid> AssignedTeacherIds { get; set; } = new();
    public List<string> AssignedTeacherNames { get; set; } = new();
    public List<Guid> AssignedStudentIds { get; set; } = new();
    public List<string> AssignedStudentNames { get; set; } = new();
}

public class AssignSubjectPeopleDto
{
    public List<Guid> PeopleIds { get; set; } = new();
}
