using System.Linq;
using FluentValidation;
using NubeEra.Application.DTOs;
using NubeEra.Domain.Common;

namespace NubeEra.Application.Validators;

/// <summary>
/// Server-side mirror of the mandatory "Restoring this backup will overwrite
/// existing data. Do you want to continue?" confirmation dialog (requirement
/// 2.5) — guarantees the restore endpoint can never be invoked without explicit
/// acknowledgement, even by a direct API call that bypasses the UI.
/// </summary>
public class RestoreConfirmationDtoValidator : AbstractValidator<RestoreConfirmationDto>
{
    public RestoreConfirmationDtoValidator()
    {
        RuleFor(x => x.ConfirmRestore)
            .Equal(true)
            .WithMessage("You must confirm that you understand this restore will overwrite existing data before continuing.");
    }
}

/// <summary>Bounds-checks the Backup History grid's search/filter/pagination query (requirement 6 — search, filter, pagination).</summary>
public class BackupHistoryQueryDtoValidator : AbstractValidator<BackupHistoryQueryDto>
{
    private static readonly string[] AllowedStatuses =
    {
        BackupConstants.StatusSuccess,
        BackupConstants.StatusFailed,
        BackupConstants.StatusInProgress
    };

    public BackupHistoryQueryDtoValidator()
    {
        RuleFor(x => x.Page)
            .GreaterThanOrEqualTo(1).WithMessage("Page must be 1 or greater.");

        RuleFor(x => x.PageSize)
            .InclusiveBetween(1, 100).WithMessage("PageSize must be between 1 and 100.");

        RuleFor(x => x.Status)
            .Must(status => string.IsNullOrWhiteSpace(status) || AllowedStatuses.Contains(status))
            .WithMessage($"Status must be one of: {string.Join(", ", AllowedStatuses)}.");

        RuleFor(x => x.Search)
            .MaximumLength(255).WithMessage("Search term is too long.");
    }
}
