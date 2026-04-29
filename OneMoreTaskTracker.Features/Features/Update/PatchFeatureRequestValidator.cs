using FluentValidation;
using OneMoreTaskTracker.Proto.Features.PatchFeatureCommand;

namespace OneMoreTaskTracker.Features.Features.Update;

public sealed class PatchFeatureRequestValidator : AbstractValidator<PatchFeatureRequest>
{
    private const int TitleMaxLength = 200;
    private const int DescriptionMaxLength = 4000;

    public PatchFeatureRequestValidator()
    {
        RuleFor(r => r.Id)
            .GreaterThan(0)
            .WithMessage("id is required");

        When(r => r.HasTitle, () =>
        {
            RuleFor(r => r.Title)
                .Cascade(CascadeMode.Stop)
                .Must(t => !string.IsNullOrWhiteSpace(t))
                .WithMessage("title is required")
                .Must(t => (t ?? string.Empty).Trim().Length <= TitleMaxLength)
                .WithMessage("title too long");
        });

        When(r => r.HasDescription, () =>
        {
            RuleFor(r => r.Description)
                .Must(d => (d ?? string.Empty).Length <= DescriptionMaxLength)
                .WithMessage("description too long");
        });

        When(r => r.HasLeadUserId, () =>
        {
            RuleFor(r => r.LeadUserId)
                .GreaterThan(0)
                .WithMessage("lead_user_id is required");
        });
    }
}
