using FluentValidation;
using OneMoreTaskTracker.Proto.Features.PatchFeatureTrackCommand;

namespace OneMoreTaskTracker.Features.Features.Update;

public sealed class PatchFeatureTrackRequestValidator : AbstractValidator<PatchFeatureTrackRequest>
{
    public PatchFeatureTrackRequestValidator()
    {
        RuleFor(r => r.FeatureId)
            .GreaterThan(0)
            .WithMessage("feature_id is required");

        RuleFor(r => r.CallerUserId)
            .GreaterThan(0)
            .WithMessage("caller_user_id is required");
    }
}
