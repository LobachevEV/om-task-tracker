using FluentValidation;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Proto.Features.PatchFeatureGateCommand;

namespace OneMoreTaskTracker.Features.Features.Update;

public sealed class PatchFeatureGateRequestValidator : AbstractValidator<PatchFeatureGateRequest>
{
    private const int RejectionReasonMaxLength = 500;

    private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "approved", "rejected", "waiting"
    };

    private static readonly HashSet<string> AllowedGateKeys = new(StringComparer.Ordinal)
    {
        FeatureStageLayout.SpecGateKey,
        FeatureStageLayout.BackendPrepGateKey,
        FeatureStageLayout.FrontendPrepGateKey,
    };

    public PatchFeatureGateRequestValidator()
    {
        RuleFor(r => r.FeatureId).GreaterThan(0).WithMessage("feature_id is required");
        RuleFor(r => r.CallerUserId).GreaterThan(0).WithMessage("caller_user_id is required");
        RuleFor(r => r.GateKey)
            .Must(k => AllowedGateKeys.Contains(k ?? string.Empty))
            .WithMessage("gate_key must be one of spec, backend.prep-gate, frontend.prep-gate");

        When(r => r.HasStatus, () =>
        {
            RuleFor(r => r.Status)
                .Must(s => AllowedStatuses.Contains(s ?? string.Empty))
                .WithMessage("status must be one of approved, rejected, waiting");

            When(r => string.Equals(r.Status, "rejected", StringComparison.OrdinalIgnoreCase), () =>
            {
                RuleFor(r => r.RejectionReason)
                    .Cascade(CascadeMode.Stop)
                    .Must(r => !string.IsNullOrWhiteSpace(r))
                    .WithMessage("rejection_reason is required when status is rejected")
                    .Must(r => (r ?? string.Empty).Trim().Length <= RejectionReasonMaxLength)
                    .WithMessage($"rejection_reason must be <= {RejectionReasonMaxLength} characters");
            });
        });
    }
}
