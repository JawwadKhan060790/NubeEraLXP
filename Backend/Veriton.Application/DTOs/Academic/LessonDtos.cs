namespace Veriton.Application.DTOs;

// ========================================
// LESSON DTOs
// ========================================

public class LessonCreateDto
{
    public Guid ModuleId { get; set; }
    public string SubTopic { get; set; } = null!;
    public string? Activity { get; set; }
    public string? VideoUrl { get; set; }
    public List<string>? VideoUrls { get; set; }
    public string? DiagramUrl { get; set; }
    public string? Source { get; set; }
    public string? Code { get; set; }
    public string? Procedure { get; set; }
    public string? RequiredMaterial { get; set; }
    public string? WhatYouGet { get; set; }
    public int SerialNumber { get; set; }
    public int TotalHours { get; set; }
    public int ExpectedPeriods { get; set; } = 1;
    public int DisplayOrder { get; set; } = 0;
    public Guid? CreatedByTeacherId { get; set; }  // Nullable - Staff users may not have a TeacherId
    public string? PdfFileUrl { get; set; }
    public bool IsActivity { get; set; }
    public bool IsRoboticsActivity { get; set; }
    public bool IsPythonActivity { get; set; }
    public bool IsAiToolActivity { get; set; }
    public string? BrowserUrl { get; set; }
}

public class LessonUpdateDto
{
    public Guid ModuleId { get; set; }
    public string SubTopic { get; set; } = null!;
    public string? Activity { get; set; }
    public string? VideoUrl { get; set; }
    public List<string>? VideoUrls { get; set; }
    public string? DiagramUrl { get; set; }
    public string? Source { get; set; }
    public string? Code { get; set; }
    public string? Procedure { get; set; }
    public string? RequiredMaterial { get; set; }
    public string? WhatYouGet { get; set; }
    public int SerialNumber { get; set; }
    public int TotalHours { get; set; }
    public int ExpectedPeriods { get; set; } = 1;
    public int DisplayOrder { get; set; } = 0;
    public Guid? CreatedByTeacherId { get; set; }  // Nullable
    public string? PdfFileUrl { get; set; }
    public bool IsActive { get; set; }
    public bool IsActivity { get; set; }
    public bool IsRoboticsActivity { get; set; }
    public bool IsPythonActivity { get; set; }
    public bool IsAiToolActivity { get; set; }
    public string? BrowserUrl { get; set; }
}

public class LessonDto
{
    public Guid Id { get; set; }
    public Guid ModuleId { get; set; }
    public string ModuleName { get; set; } = "";
    public string SubTopic { get; set; } = null!;
    public string? Activity { get; set; }
    public string? VideoUrl { get; set; }
    public List<string>? VideoUrls { get; set; }
    public string? DiagramUrl { get; set; }
    public string? Source { get; set; }
    public string? Code { get; set; }
    public string? Procedure { get; set; }
    public string? RequiredMaterial { get; set; }
    public string? WhatYouGet { get; set; }
    public int SerialNumber { get; set; }
    public int TotalHours { get; set; }
    public int ExpectedPeriods { get; set; }
    public int DisplayOrder { get; set; }
    public Guid? CreatedByTeacherId { get; set; }
    public string CreatedByTeacherName { get; set; } = "";
    public string? PdfFileUrl { get; set; }
    public bool IsActive { get; set; }
    public bool IsActivity { get; set; }
    public bool IsRoboticsActivity { get; set; }
    public bool IsPythonActivity { get; set; }
    public bool IsAiToolActivity { get; set; }
    public string? BrowserUrl { get; set; }
    public DateTime CreatedAt { get; set; }
}
