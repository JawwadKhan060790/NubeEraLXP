using FluentValidation;
using Veriton.Application.DTOs;

namespace Veriton.Application.Validators;

/// <summary>
/// Encodes the mandatory grade-range validation rules (FromGrade/ToGrade) from the
/// Global Grade Standardization spec, applied to both School create and update:
///   - Both values must be between 1 and 10 (the standardized 1st-10th Grade master).
///   - From Grade cannot be greater than To Grade.
///   - A school cannot be activated without a valid grade range configuration.
///
/// These constants/messages are shared so the rule text is identical everywhere
/// (single source of truth for the validation copy as well as the logic).
/// </summary>
public static class SchoolGradeRangeRules
{
    public const int MinGrade = -1;
    public const int MaxGrade = 10;

    public const string FromGradeRangeMessage = "From Grade must be between -1 and 10.";
    public const string ToGradeRangeMessage = "To Grade must be between -1 and 10.";
    public const string FromNotGreaterThanToMessage = "From Grade cannot be greater than To Grade.";
    public const string ActivationRequiresRangeMessage =
        "A school cannot be activated without a valid grade range (From Grade and To Grade, both -1 to 10, From <= To).";

    public static bool IsWithinMasterRange(int? value) => !value.HasValue || (value.Value >= MinGrade && value.Value <= MaxGrade);

    public static bool IsValidRange(int? from, int? to)
        => from.HasValue && to.HasValue
           && IsWithinMasterRange(from) && IsWithinMasterRange(to)
           && from.Value <= to.Value;
}

public class SchoolCreateDtoValidator : AbstractValidator<SchoolCreateDto>
{
    public SchoolCreateDtoValidator()
    {
        RuleFor(x => x.SchoolCode).NotEmpty().WithMessage("School code is required.").MaximumLength(50);
        RuleFor(x => x.Name).NotEmpty().WithMessage("School name is required.").MaximumLength(200);

        RuleFor(x => x.FromGrade)
            .Must(SchoolGradeRangeRules.IsWithinMasterRange)
            .WithMessage(SchoolGradeRangeRules.FromGradeRangeMessage);

        RuleFor(x => x.ToGrade)
            .Must(SchoolGradeRangeRules.IsWithinMasterRange)
            .WithMessage(SchoolGradeRangeRules.ToGradeRangeMessage);

        RuleFor(x => x)
            .Must(x => !x.FromGrade.HasValue || !x.ToGrade.HasValue || x.FromGrade.Value <= x.ToGrade.Value)
            .WithMessage(SchoolGradeRangeRules.FromNotGreaterThanToMessage)
            .WithName("FromGrade");

        // Schools are created active by default (see GenericSchoolService.CreateAsync),
        // so a valid grade range is mandatory at creation time.
        RuleFor(x => x)
            .Must(x => SchoolGradeRangeRules.IsValidRange(x.FromGrade, x.ToGrade))
            .WithMessage(SchoolGradeRangeRules.ActivationRequiresRangeMessage)
            .WithName("GradeRange");
    }
}

public class SchoolUpdateDtoValidator : AbstractValidator<SchoolUpdateDto>
{
    public SchoolUpdateDtoValidator()
    {
        RuleFor(x => x.SchoolCode).NotEmpty().WithMessage("School code is required.").MaximumLength(50);
        RuleFor(x => x.Name).NotEmpty().WithMessage("School name is required.").MaximumLength(200);

        RuleFor(x => x.FromGrade)
            .Must(SchoolGradeRangeRules.IsWithinMasterRange)
            .WithMessage(SchoolGradeRangeRules.FromGradeRangeMessage);

        RuleFor(x => x.ToGrade)
            .Must(SchoolGradeRangeRules.IsWithinMasterRange)
            .WithMessage(SchoolGradeRangeRules.ToGradeRangeMessage);

        RuleFor(x => x)
            .Must(x => !x.FromGrade.HasValue || !x.ToGrade.HasValue || x.FromGrade.Value <= x.ToGrade.Value)
            .WithMessage(SchoolGradeRangeRules.FromNotGreaterThanToMessage)
            .WithName("FromGrade");

        // "School cannot be activated without valid grade range configuration":
        // only enforced when the incoming DTO requests an active school.
        RuleFor(x => x)
            .Must(x => !x.IsActive || SchoolGradeRangeRules.IsValidRange(x.FromGrade, x.ToGrade))
            .WithMessage(SchoolGradeRangeRules.ActivationRequiresRangeMessage)
            .WithName("GradeRange");
    }
}
