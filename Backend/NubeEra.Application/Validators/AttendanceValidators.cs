using FluentValidation;
using NubeEra.Application.DTOs;

namespace NubeEra.Application.Validators;

// ─────────────────────────────────────────────────────────────────────────────
// Attendance Validators
// ─────────────────────────────────────────────────────────────────────────────

public class AttendanceDtoValidator : AbstractValidator<AttendanceDto>
{
    private static readonly string[] ValidStatuses = ["Present", "Absent", "Late", "Excused"];

    public AttendanceDtoValidator()
    {
        RuleFor(x => x.Date)
            .NotEmpty().WithMessage("Attendance date is required.")
            .LessThanOrEqualTo(DateTime.UtcNow.AddDays(1))
            .WithMessage("Attendance date cannot be in the future.");

        RuleFor(x => x.Status)
            .NotEmpty().WithMessage("Attendance status is required.")
            .Must(s => ValidStatuses.Contains(s))
            .WithMessage($"Status must be one of: {string.Join(", ", ValidStatuses)}.");

        RuleFor(x => x.Remarks)
            .MaximumLength(500).When(x => x.Remarks is not null);

        RuleFor(x => x)
            .Must(x => x.TeacherId.HasValue || x.StudentId.HasValue)
            .WithMessage("Either TeacherId or StudentId must be provided.");
    }
}

public class BulkAttendanceValidator : AbstractValidator<List<AttendanceDto>>
{
    public BulkAttendanceValidator()
    {
        RuleFor(x => x)
            .NotEmpty().WithMessage("Attendance list cannot be empty.")
            .Must(list => list.Count <= 500).WithMessage("Cannot save more than 500 attendance records at once.");

        RuleForEach(x => x).SetValidator(new AttendanceDtoValidator());
    }
}
