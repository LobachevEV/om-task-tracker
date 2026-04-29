using FluentValidation;
using Grpc.Core;
using OneMoreTaskTracker.Proto.Tasks.AttachTaskCommand;

namespace OneMoreTaskTracker.Tasks.Tasks.Attach;

public sealed class DetachTaskFromFeatureRequestValidator : AbstractValidator<DetachTaskFromFeatureRequest>
{
    public DetachTaskFromFeatureRequestValidator()
    {
        RuleFor(r => r.ReassignToFeatureId)
            .GreaterThan(0)
            .WithMessage("detach requires reassign_to_feature_id because Task.FeatureId is non-nullable")
            .WithState(_ => StatusCode.FailedPrecondition);
    }
}
