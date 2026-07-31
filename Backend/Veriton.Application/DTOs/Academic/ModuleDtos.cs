namespace Veriton.Application.DTOs;

// ========================================
// MODULE (Unit) DTOs — school-agnostic, grade-level master content.
// Per-school visibility is granted separately via SchoolCurriculumAssignment
// (/admin/curriculum-assignment), not via fields on this DTO.
// ========================================

public class ModuleCreateDto
{
    public Guid GradeLevelId { get; set; }
    public Guid? SubjectId { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public int Credits { get; set; }
    public Guid? CreatedByTeacherId { get; set; }
    public string? PdfFileUrl { get; set; }
}

public class ModuleUpdateDto
{
    public Guid GradeLevelId { get; set; }
    public Guid? SubjectId { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public int Credits { get; set; }
    public Guid? CreatedByTeacherId { get; set; }
    public string? PdfFileUrl { get; set; }
    public bool IsActive { get; set; }
}

public class ModuleDto
{
    public Guid Id { get; set; }
    public Guid GradeLevelId { get; set; }
    public string GradeLevelName { get; set; } = "";
    public Guid? SubjectId { get; set; }
    public string SubjectName { get; set; } = "";
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public int Credits { get; set; }
    public Guid? CreatedByTeacherId { get; set; }
    public string CreatedByTeacherName { get; set; } = "";
    public string? PdfFileUrl { get; set; }
    public bool IsActive { get; set; }
    public int LessonCount { get; set; }
    public int ExamCount { get; set; }
    public int ExpectedPeriods { get; set; }

    // How many schools currently have this Unit assigned (via SchoolUnitAssignment) —
    // surfaced on the Units list so admins can tell at a glance whether a unit has been
    // rolled out anywhere yet, without having to open the separate Curriculum Assignment
    // screen for every school one at a time.
    public int AssignedSchoolCount { get; set; }
}
