using FluentValidation;
using OneMoreTaskTracker.Proto.Features.DeleteFeatureSubStageCommand;

namespace OneMoreTaskTracker.Features.Features.Update;

public sealed class DeleteFeatureSubStageRequestValidator : AbstractValidator<DeleteFeatureSubStageRequest>
{
    public DeleteFeatureSubStageRequestValidator()
    {
        RuleFor(r => r.FeatureId).GreaterThan(0).WithMessage("feature_id is required");
        RuleFor(r => r.SubStageId).GreaterThan(0).WithMessage("sub_stage_id is required");
        RuleFor(r => r.CallerUserId).GreaterThan(0).WithMessage("caller_user_id is required");
    }
}
