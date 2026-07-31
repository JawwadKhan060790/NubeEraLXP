namespace Veriton.Application.DTOs;

// ========================================
// QUESTION DTOs
// ========================================

public class QuestionCreateDto
{
    public Guid? ExamId { get; set; }
    public Guid? ModuleId { get; set; }
    public string QuestionText { get; set; } = null!;
    public string OptionA { get; set; } = null!;
    public string OptionB { get; set; } = null!;
    public string OptionC { get; set; } = null!;
    public string OptionD { get; set; } = null!;
    public string CorrectAnswer { get; set; } = null!;
}

public class QuestionUpdateDto
{
    public Guid? ExamId { get; set; }
    public Guid? ModuleId { get; set; }
    public string QuestionText { get; set; } = null!;
    public string OptionA { get; set; } = null!;
    public string OptionB { get; set; } = null!;
    public string OptionC { get; set; } = null!;
    public string OptionD { get; set; } = null!;
    public string CorrectAnswer { get; set; } = null!;
    public bool IsActive { get; set; }
}

public class QuestionDto
{
    public Guid Id { get; set; }
    public Guid? ExamId { get; set; }
    public string? ExamTitle { get; set; }
    public Guid? GradeId { get; set; }
    public string? GradeName { get; set; }
    public Guid? ModuleId { get; set; }
    public string? ModuleName { get; set; }
    public string QuestionText { get; set; } = null!;
    public string OptionA { get; set; } = null!;
    public string OptionB { get; set; } = null!;
    public string OptionC { get; set; } = null!;
    public string OptionD { get; set; } = null!;
    public string CorrectAnswer { get; set; } = null!;
    public bool IsActive { get; set; }
}
