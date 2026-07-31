using FluentValidation;
using Veriton.Application.DTOs;

namespace Veriton.Application.Validators;

public class SubjectCreateValidator : AbstractValidator<SubjectCreateDto>
{
    public SubjectCreateValidator()
    {
        RuleFor(x => x.GradeLevelId)
            .NotEmpty().WithMessage("Grade Level is required.");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Subject name is required.")
            .MaximumLength(200).WithMessage("Subject name cannot exceed 200 characters.");

        RuleFor(x => x.Description)
            .MaximumLength(1000).WithMessage("Description cannot exceed 1000 characters.");
    }
}

public class SubjectUpdateValidator : AbstractValidator<SubjectUpdateDto>
{
    public SubjectUpdateValidator()
    {
        RuleFor(x => x.GradeLevelId)
            .NotEmpty().WithMessage("Grade Level is required.");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Subject name is required.")
            .MaximumLength(200).WithMessage("Subject name cannot exceed 200 characters.");

        RuleFor(x => x.Description)
            .MaximumLength(1000).WithMessage("Description cannot exceed 1000 characters.");
    }
}
