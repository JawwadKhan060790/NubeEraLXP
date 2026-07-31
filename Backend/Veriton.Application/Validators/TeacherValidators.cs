using FluentValidation;
using Veriton.Application.DTOs;

namespace Veriton.Application.Validators;

// ─────────────────────────────────────────────────────────────────────────────
// Teacher Validators
// ─────────────────────────────────────────────────────────────────────────────

public class TeacherCreateValidator : AbstractValidator<TeacherCreateDto>
{
    public TeacherCreateValidator()
    {
        RuleFor(x => x.EmployeeId)
            .NotEmpty().WithMessage("Employee ID is required.")
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

        RuleFor(x => x.Salary)
            .GreaterThan(0).WithMessage("Salary must be a positive value.")
            .When(x => x.Salary.HasValue);

        RuleFor(x => x.DateOfBirth)
            .LessThan(DateTime.UtcNow).WithMessage("Date of birth must be in the past.")
            .When(x => x.DateOfBirth.HasValue);

        RuleFor(x => x.Gender)
            .Must(g => g is null || new[] { "Male", "Female", "Other" }.Contains(g))
            .WithMessage("Gender must be Male, Female, or Other.");
    }
}

public class TeacherUpdateValidator : AbstractValidator<TeacherUpdateDto>
{
    public TeacherUpdateValidator()
    {
        // Cannot use Include(new TeacherCreateValidator()) — FluentValidation's Include()
        // only accepts IValidator<TeacherUpdateDto>, not IValidator<TeacherCreateDto>.
        // Rules duplicated directly here.
        RuleFor(x => x.EmployeeId)
            .NotEmpty().WithMessage("Employee ID is required.")
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

        RuleFor(x => x.Salary)
            .GreaterThan(0).WithMessage("Salary must be a positive value.")
            .When(x => x.Salary.HasValue);

        RuleFor(x => x.DateOfBirth)
            .LessThan(DateTime.UtcNow).WithMessage("Date of birth must be in the past.")
            .When(x => x.DateOfBirth.HasValue);

        RuleFor(x => x.Gender)
            .Must(g => g is null || new[] { "Male", "Female", "Other" }.Contains(g))
            .WithMessage("Gender must be Male, Female, or Other.");
    }
}
