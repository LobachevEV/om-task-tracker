using FluentValidation;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Stages;

public sealed class PatchFeatureStagePayloadValidator : AbstractValidator<PatchFeatureStagePayload>
{
    private const int MinReleaseYear = 2000;
    private const int MaxReleaseYear = 2100;

    public PatchFeatureStagePayloadValidator()
    {
        When(p => !string.IsNullOrEmpty(p.PlannedStart), () =>
        {
            RuleFor(p => p.PlannedStart!)
                .Cascade(CascadeMode.Stop)
                .Must(IsIso8601Date).WithMessage("Date must be YYYY-MM-DD")
                .Must(IsRealReleaseYear).WithMessage("Use a real release date");
        });

        When(p => !string.IsNullOrEmpty(p.PlannedEnd), () =>
        {
            RuleFor(p => p.PlannedEnd!)
                .Cascade(CascadeMode.Stop)
                .Must(IsIso8601Date).WithMessage("Date must be YYYY-MM-DD")
                .Must(IsRealReleaseYear).WithMessage("Use a real release date");
        });
    }

    private static bool IsIso8601Date(string raw) =>
        !string.IsNullOrWhiteSpace(raw) && DateOnly.TryParseExact(raw, "yyyy-MM-dd", out _);

    private static bool IsRealReleaseYear(string raw)
    {
        if (!DateOnly.TryParseExact(raw, "yyyy-MM-dd", out var d))
            return true;
        return d.Year >= MinReleaseYear && d.Year <= MaxReleaseYear;
    }
}
