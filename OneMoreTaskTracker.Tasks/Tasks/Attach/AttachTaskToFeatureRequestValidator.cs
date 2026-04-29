using FluentValidation;
using OneMoreTaskTracker.Proto.Tasks.AttachTaskCommand;

namespace OneMoreTaskTracker.Tasks.Tasks.Attach;

public sealed class AttachTaskToFeatureRequestValidator : AbstractValidator<AttachTaskToFeatureRequest>
{
    public AttachTaskToFeatureRequestValidator()
    {
        RuleFor(r => r.JiraTaskId)
            .NotEmpty()
            .WithMessage("jira_task_id is required");

        RuleFor(r => r.FeatureId)
            .GreaterThan(0)
            .WithMessage("feature_id is required");
    }
}
