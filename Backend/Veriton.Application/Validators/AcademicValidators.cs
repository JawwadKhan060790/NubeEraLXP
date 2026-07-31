using FluentValidation;
using Veriton.Application.DTOs;

namespace Veriton.Application.Validators;

// ─────────────────────────────────────────────────────────────────────────────
// Module Validators
// ─────────────────────────────────────────────────────────────────────────────

public class ModuleCreateValidator : AbstractValidator<ModuleCreateDto>
{
    public ModuleCreateValidator()
    {
        RuleFor(x => x.GradeLevelId)
            .NotEmpty().WithMessage("Grade level is required.");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Module name is required.")
            .MaximumLength(200);
    }
}

public class ModuleUpdateValidator : AbstractValidator<ModuleUpdateDto>
{
    public ModuleUpdateValidator()
    {
        // Cannot use Include(new ModuleCreateValidator()) — FluentValidation's Include()
        // only accepts IValidator<ModuleUpdateDto>, not IValidator<ModuleCreateDto>.
        // Rules duplicated directly here.
        RuleFor(x => x.GradeLevelId)
            .NotEmpty().WithMessage("Grade level is required.");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Module name is required.")
            .MaximumLength(200);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exam Validators
// ─────────────────────────────────────────────────────────────────────────────

public class ExamCreateValidator : AbstractValidator<ExamCreateDto>
{
    public ExamCreateValidator()
    {
        RuleFor(x => x.GradeId)
            .NotEmpty().WithMessage("Grade is required.");

        RuleFor(x => x.ModuleId)
            .NotEmpty().WithMessage("Module is required.");

        RuleFor(x => x.Date)
            .NotEmpty().WithMessage("Exam date is required.");

        RuleFor(x => x.Title)
            .MaximumLength(300).When(x => x.Title is not null);

        RuleFor(x => x.TotalMarks)
            .GreaterThan(0).WithMessage("Total marks must be greater than 0.")
            .When(x => x.TotalMarks.HasValue);

        RuleFor(x => x.PassingMarks)
            .GreaterThan(0).WithMessage("Passing marks must be greater than 0.")
            .When(x => x.PassingMarks.HasValue);

        RuleFor(x => x)
            .Must(x => !x.PassingMarks.HasValue || !x.TotalMarks.HasValue || x.PassingMarks <= x.TotalMarks)
            .WithMessage("Passing marks cannot exceed total marks.")
            .When(x => x.PassingMarks.HasValue && x.TotalMarks.HasValue);

        RuleFor(x => x.DurationMinutes)
            .GreaterThan(0).WithMessage("Duration must be greater than 0 minutes.")
            .When(x => x.DurationMinutes.HasValue);
    }
}

public class ExamUpdateValidator : AbstractValidator<ExamUpdateDto>
{
    public ExamUpdateValidator()
    {
        RuleFor(x => x.GradeId).NotEmpty().WithMessage("Grade is required.");
        RuleFor(x => x.ModuleId).NotEmpty().WithMessage("Module is required.");
        RuleFor(x => x.Date).NotEmpty().WithMessage("Exam date is required.");

        RuleFor(x => x.TotalMarks)
            .GreaterThan(0).When(x => x.TotalMarks.HasValue);

        RuleFor(x => x.PassingMarks)
            .GreaterThan(0).When(x => x.PassingMarks.HasValue);

        RuleFor(x => x)
            .Must(x => !x.PassingMarks.HasValue || !x.TotalMarks.HasValue || x.PassingMarks <= x.TotalMarks)
            .WithMessage("Passing marks cannot exceed total marks.")
            .When(x => x.PassingMarks.HasValue && x.TotalMarks.HasValue);
    }
}
