using FluentValidation;
using System;
using System.Linq;
using System.Text.RegularExpressions;
using NubeEra.Application.DTOs;

namespace NubeEra.Application.Validators;

/// <summary>
/// Validates Grade create/update DTOs. The grade level can be supplied either way:
///   - GradeLevelId (preferred): a grade_levels.Id GUID — resolved/validated against
///     the master table in GradeService, so no format check is needed here beyond
///     "not the empty GUID".
///   - GradeLevel (legacy): a string that must resolve to a whole number -1 to 10.
/// Exactly one of the two must be supplied.
/// </summary>
public class GradeCreateValidator : AbstractValidator<GradeCreateDto>
{
    public GradeCreateValidator()
    {
        RuleFor(x => x)
            .Must(x => x.GradeLevelId.HasValue || !string.IsNullOrWhiteSpace(x.GradeLevel) || HasValidLevelInName(x.GradeName))
            .WithMessage("Grade name must contain a valid level name or number (e.g. \"Boot camp\", \"Foundation Course\", \"Grade I\" or \"Grade 5\").");

        RuleFor(x => x.GradeLevelId)
            .NotEqual(Guid.Empty).WithMessage("Grade level is required.")
            .When(x => x.GradeLevelId.HasValue);

        RuleFor(x => x.GradeLevel)
            .Must(IsValidGradeLevel)
            .WithMessage("Grade level must be a whole number between -1 and 10.")
            .When(x => !x.GradeLevelId.HasValue && !string.IsNullOrWhiteSpace(x.GradeLevel));

        RuleFor(x => x.GradeName)
            .MaximumLength(100).WithMessage("Grade name must not exceed 100 characters.");

        RuleFor(x => x.Capacity)
            .GreaterThanOrEqualTo(0).WithMessage("Capacity cannot be negative.")
            .LessThanOrEqualTo(500).WithMessage("Capacity cannot exceed 500.")
            .When(x => x.Capacity.HasValue);

        RuleFor(x => x.AcademicYear)
            .MaximumLength(20).WithMessage("Academic year must not exceed 20 characters.");
    }

    internal static bool IsValidGradeLevel(string? gradeLevel)
    {
        if (string.IsNullOrWhiteSpace(gradeLevel)) return false;
        var match = Regex.Match(gradeLevel, @"-?\d+");
        return match.Success && int.TryParse(match.Value, out var n) && n >= -1 && n <= 10;
    }

    internal static bool HasValidLevelInName(string? gradeName)
    {
        if (string.IsNullOrWhiteSpace(gradeName)) return false;

        var nameUpper = gradeName.ToUpperInvariant();
        if (nameUpper.Contains("BOOT CAMP") || nameUpper.Contains("FOUNDATION COURSE"))
        {
            return true;
        }

        // Check for Roman Numerals: I, II, III, IV, V, VI, VII, VIII, IX, X
        var romanNumerals = new[] { "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X" };
        var words = nameUpper.Split(new[] { ' ', '-', '_' }, StringSplitOptions.RemoveEmptyEntries);
        if (words.Any(w => romanNumerals.Contains(w)))
        {
            return true;
        }

        var match = Regex.Match(gradeName, @"-?\d+");
        return match.Success && int.TryParse(match.Value, out var n) && n >= -1 && n <= 10;
    }
}

public class GradeUpdateValidator : AbstractValidator<GradeUpdateDto>
{
    public GradeUpdateValidator()
    {
        RuleFor(x => x)
            .Must(x => x.GradeLevelId.HasValue || !string.IsNullOrWhiteSpace(x.GradeLevel) || GradeCreateValidator.HasValidLevelInName(x.GradeName))
            .WithMessage("Grade name must contain a valid level name or number (e.g. \"Boot camp\", \"Foundation Course\", \"Grade I\" or \"Grade 5\").");

        RuleFor(x => x.GradeLevelId)
            .NotEqual(Guid.Empty).WithMessage("Grade level is required.")
            .When(x => x.GradeLevelId.HasValue);

        RuleFor(x => x.GradeLevel)
            .Must(GradeCreateValidator.IsValidGradeLevel)
            .WithMessage("Grade level must be a whole number between -1 and 10.")
            .When(x => !x.GradeLevelId.HasValue && !string.IsNullOrWhiteSpace(x.GradeLevel));

        RuleFor(x => x.GradeName)
            .MaximumLength(100).WithMessage("Grade name must not exceed 100 characters.");

        RuleFor(x => x.Capacity)
            .GreaterThanOrEqualTo(0).WithMessage("Capacity cannot be negative.")
            .LessThanOrEqualTo(500).WithMessage("Capacity cannot exceed 500.")
            .When(x => x.Capacity.HasValue);

        RuleFor(x => x.AcademicYear)
            .MaximumLength(20).WithMessage("Academic year must not exceed 20 characters.");
    }
}
