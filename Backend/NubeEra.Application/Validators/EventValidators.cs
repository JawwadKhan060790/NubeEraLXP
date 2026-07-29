using FluentValidation;
using NubeEra.Application.DTOs;

namespace NubeEra.Application.Validators;

// ─────────────────────────────────────────────────────────────────────────────
// Event Validators
// ─────────────────────────────────────────────────────────────────────────────

public class CreateEventValidator : AbstractValidator<CreateEventDto>
{
    public CreateEventValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Event title is required.")
            .MaximumLength(300);

        RuleFor(x => x.Description)
            .NotEmpty().WithMessage("Event description is required.")
            .MaximumLength(2000);

        RuleFor(x => x.Category)
            .NotEmpty().WithMessage("Event category is required.")
            .MaximumLength(100);

        RuleFor(x => x.Date)
            .NotEmpty().WithMessage("Event date is required.");

        RuleFor(x => x.Deadline)
            .NotEmpty().WithMessage("Registration deadline is required.")
            .LessThanOrEqualTo(x => x.Date)
            .WithMessage("Registration deadline must be on or before the event date.");

        RuleFor(x => x.Venue)
            .NotEmpty().WithMessage("Venue is required.")
            .MaximumLength(300);

        RuleFor(x => x.MaxParticipants)
            .GreaterThan(0).WithMessage("Max participants must be greater than 0.");

        RuleFor(x => x.MaxTeams)
            .GreaterThanOrEqualTo(0).WithMessage("Max teams cannot be negative.");

        RuleFor(x => x.WaitlistLimit)
            .GreaterThanOrEqualTo(0).WithMessage("Waitlist limit cannot be negative.");
    }
}

public class SubmitRegistrationValidator : AbstractValidator<SubmitRegistrationDto>
{
    public SubmitRegistrationValidator()
    {
        RuleFor(x => x.StudentId)
            .NotEmpty().WithMessage("Student ID is required.");

        RuleFor(x => x.StudentName)
            .NotEmpty().WithMessage("Student name is required.")
            .MaximumLength(200);

        RuleFor(x => x.StudentGrade)
            .NotEmpty().WithMessage("Student grade is required.");

        RuleFor(x => x.StudentSchool)
            .NotEmpty().WithMessage("Student school is required.");

        RuleFor(x => x.ParentName)
            .NotEmpty().WithMessage("Parent name is required.")
            .MaximumLength(200);

        RuleFor(x => x.ParentPhone)
            .NotEmpty().WithMessage("Parent phone is required.")
            .MaximumLength(20);

        RuleFor(x => x.ParentEmail)
            .NotEmpty().WithMessage("Parent email is required.")
            .EmailAddress().WithMessage("A valid parent email is required.");
    }
}
