using FluentValidation;
using NubeEra.Application.DTOs;

namespace NubeEra.Application.Validators;

// ─────────────────────────────────────────────────────────────────────────────
// School Validators
// ─────────────────────────────────────────────────────────────────────────────

public class SchoolCreateValidator : AbstractValidator<SchoolCreateDto>
{
    public SchoolCreateValidator()
    {
        RuleFor(x => x.SchoolCode)
            .NotEmpty().WithMessage("School code is required.")
            .MaximumLength(50);

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("School name is required.")
            .MaximumLength(200);

        RuleFor(x => x.ContactEmail)
            .EmailAddress().WithMessage("A valid contact email is required.")
            .MaximumLength(256)
            .When(x => !string.IsNullOrWhiteSpace(x.ContactEmail));

        RuleFor(x => x.PrincipalEmail)
            .EmailAddress().WithMessage("A valid principal email is required.")
            .MaximumLength(256)
            .When(x => !string.IsNullOrWhiteSpace(x.PrincipalEmail));

        RuleFor(x => x.FromGrade)
            .InclusiveBetween(1, 10).WithMessage("FromGrade must be between 1 and 10.")
            .When(x => x.FromGrade.HasValue);

        RuleFor(x => x.ToGrade)
            .InclusiveBetween(1, 10).WithMessage("ToGrade must be between 1 and 10.")
            .When(x => x.ToGrade.HasValue);

        RuleFor(x => x)
            .Must(x => !x.FromGrade.HasValue || !x.ToGrade.HasValue || x.FromGrade <= x.ToGrade)
            .WithMessage("FromGrade must not exceed ToGrade.")
            .When(x => x.FromGrade.HasValue && x.ToGrade.HasValue);
    }
}

public class SchoolUpdateValidator : AbstractValidator<SchoolUpdateDto>
{
    public SchoolUpdateValidator()
    {
        Include(new SchoolCreateValidator());
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Grade Validators
// ─────────────────────────────────────────────────────────────────────────────

// Duplicate grade validators removed
