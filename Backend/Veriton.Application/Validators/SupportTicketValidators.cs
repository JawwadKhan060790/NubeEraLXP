using FluentValidation;
using Veriton.Application.DTOs;

namespace Veriton.Application.Validators;

// ─────────────────────────────────────────────────────────────────────────────
// Support Ticket Validators
// ─────────────────────────────────────────────────────────────────────────────

public class CreateTicketValidator : AbstractValidator<CreateTicketDto>
{
    public CreateTicketValidator()
    {
        RuleFor(x => x.Subject)
            .NotEmpty().WithMessage("Ticket subject is required.")
            .MaximumLength(300);

        RuleFor(x => x.Description)
            .NotEmpty().WithMessage("Ticket description is required.")
            .MinimumLength(10).WithMessage("Description must be at least 10 characters.")
            .MaximumLength(5000);

        RuleFor(x => x.CategoryId)
            .NotEmpty().WithMessage("Category is required.");

        RuleForEach(x => x.Attachments).SetValidator(new CreateAttachmentValidator());
    }
}

public class CreateAttachmentValidator : AbstractValidator<CreateAttachmentDto>
{
    private static readonly string[] AllowedTypes = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx", ".xlsx", ".txt"];

    public CreateAttachmentValidator()
    {
        RuleFor(x => x.FileName)
            .NotEmpty().WithMessage("Attachment file name is required.")
            .MaximumLength(255);

        RuleFor(x => x.FileUrl)
            .NotEmpty().WithMessage("Attachment URL is required.");

        RuleFor(x => x.FileType)
            .Must(t => AllowedTypes.Contains(t.ToLower()))
            .WithMessage($"File type must be one of: {string.Join(", ", AllowedTypes)}.")
            .When(x => !string.IsNullOrWhiteSpace(x.FileType));

        RuleFor(x => x.FileSize)
            .GreaterThan(0).WithMessage("File size must be greater than 0.")
            .LessThanOrEqualTo(10 * 1024 * 1024).WithMessage("File size must not exceed 10 MB.");
    }
}

public class CreateCommentDtoValidator : AbstractValidator<CreateCommentDto>
{
    public CreateCommentDtoValidator()
    {
        RuleFor(x => x.Content)
            .NotEmpty().WithMessage("Comment content is required.")
            .MaximumLength(2000);
    }
}

public class CreateCategoryValidator : AbstractValidator<CreateCategoryDto>
{
    public CreateCategoryValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Category name is required.")
            .MaximumLength(100);

        RuleFor(x => x.Description)
            .MaximumLength(500).When(x => x.Description is not null);
    }
}
