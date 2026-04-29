using FluentValidation;
using OneMoreTaskTracker.Proto.Tasks.CreateTaskCommand;

namespace OneMoreTaskTracker.Tasks.Tasks.Create;

public sealed class CreateTaskRequestValidator : AbstractValidator<CreateTaskRequest>
{
    public CreateTaskRequestValidator()
    {
        RuleFor(r => r.FeatureId)
            .GreaterThan(0)
            .WithMessage("feature_id is required");
    }
}
