using FluentValidation;
using Veriton.Application.DTOs;

namespace Veriton.Application.Validators;

// ─────────────────────────────────────────────────────────────────────────────
// Student Validators
// ─────────────────────────────────────────────────────────────────────────────

public class StudentCreateValidator : AbstractValidator<StudentCreateDto>
{
    public StudentCreateValidator()
    {
        RuleFor(x => x.GradeId)
            .NotEmpty().WithMessage("Grade is required.");

        RuleFor(x => x.StudentId)
            .MaximumLength(50);

        RuleFor(x => x.FirstName)
            .NotEmpty().WithMessage("First name is required.")
            .MaximumLength(100);

        RuleFor(x => x.LastName)
            .NotEmpty().WithMessage("Last name is required.")
            .MaximumLength(100);

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("A valid email is required.")
            .MaximumLength(256);

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password is required.")
            .MinimumLength(6).WithMessage("Password must be at least 6 characters.");

        RuleFor(x => x.Phone)
            .MaximumLength(20).When(x => x.Phone is not null);

        RuleFor(x => x.DateOfBirth)
            .LessThan(DateTime.UtcNow).WithMessage("Date of birth must be in the past.")
            .When(x => x.DateOfBirth.HasValue);

        RuleFor(x => x.Gender)
            .Must(g => g is null || new[] { "Male", "Female", "Other" }.Contains(g))
            .WithMessage("Gender must be Male, Female, or Other.");

        RuleFor(x => x.ParentGuardianEmail)
            .EmailAddress().WithMessage("A valid parent/guardian email is required.")
            .When(x => !string.IsNullOrWhiteSpace(x.ParentGuardianEmail));
    }
}

public class StudentUpdateValidator : AbstractValidator<StudentUpdateDto>
{
    public StudentUpdateValidator()
    {
        RuleFor(x => x.GradeId)
            .NotEmpty().WithMessage("Grade is required.");

        RuleFor(x => x.StudentId)
            .MaximumLength(50);

        RuleFor(x => x.FirstName)
            .NotEmpty().WithMessage("First name is required.")
            .MaximumLength(100);

        RuleFor(x => x.LastName)
            .NotEmpty().WithMessage("Last name is required.")
            .MaximumLength(100);

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("A valid email is required.")
            .MaximumLength(256);

        RuleFor(x => x.Phone)
            .MaximumLength(20).When(x => x.Phone is not null);

        RuleFor(x => x.DateOfBirth)
            .LessThan(DateTime.UtcNow).WithMessage("Date of birth must be in the past.")
            .When(x => x.DateOfBirth.HasValue);

        RuleFor(x => x.Gender)
            .Must(g => g is null || new[] { "Male", "Female", "Other" }.Contains(g))
            .WithMessage("Gender must be Male, Female, or Other.");

        RuleFor(x => x.ParentGuardianEmail)
            .EmailAddress().WithMessage("A valid parent/guardian email is required.")
            .When(x => !string.IsNullOrWhiteSpace(x.ParentGuardianEmail));
    }
}
