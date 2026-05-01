using FluentValidation;
using OneMoreTaskTracker.Proto.Features.AppendFeatureSubStageCommand;

namespace OneMoreTaskTracker.Features.Features.Update;

public sealed class AppendFeatureSubStageRequestValidator : AbstractValidator<AppendFeatureSubStageRequest>
{
    private const int MinYear = 2000;
    private const int MaxYear = 2100;

    private static readonly HashSet<string> AllowedTracks = new(StringComparer.OrdinalIgnoreCase)
    {
        "backend", "frontend"
    };

    private static readonly HashSet<string> AllowedPhases = new(StringComparer.OrdinalIgnoreCase)
    {
        "development", "stand-testing", "standtesting"
    };

    public AppendFeatureSubStageRequestValidator()
    {
        RuleFor(r => r.FeatureId).GreaterThan(0).WithMessage("feature_id is required");
        RuleFor(r => r.CallerUserId).GreaterThan(0).WithMessage("caller_user_id is required");
        RuleFor(r => r.Track)
            .Must(t => AllowedTracks.Contains(t ?? string.Empty))
            .WithMessage("track must be backend|frontend");
        RuleFor(r => r.Phase)
            .Must(p => AllowedPhases.Contains(p ?? string.Empty))
            .WithMessage("phase must be development or stand-testing");

        When(r => r.HasOwnerUserId, () =>
        {
            RuleFor(r => r.OwnerUserId)
                .GreaterThanOrEqualTo(0)
                .WithMessage("owner_user_id must be >= 0");
        });

        When(r => r.HasPlannedStart && !string.IsNullOrEmpty(r.PlannedStart), () =>
        {
            RuleFor(r => r.PlannedStart)
                .Cascade(CascadeMode.Stop)
                .Must(IsIso8601Date)
                .WithMessage("planned_start must be YYYY-MM-DD")
                .Must(IsRealReleaseYear)
                .WithMessage("Use a real release date");
        });

        When(r => r.HasPlannedEnd && !string.IsNullOrEmpty(r.PlannedEnd), () =>
        {
            RuleFor(r => r.PlannedEnd)
                .Cascade(CascadeMode.Stop)
                .Must(IsIso8601Date)
                .WithMessage("planned_end must be YYYY-MM-DD")
                .Must(IsRealReleaseYear)
                .WithMessage("Use a real release date");
        });

        RuleFor(r => r)
            .Must(r => HasValidDateOrder(r.PlannedStart, r.PlannedEnd))
            .WithMessage("planned_end must be on or after planned_start")
            .When(r => r.HasPlannedStart && r.HasPlannedEnd
                       && IsIso8601Date(r.PlannedStart) && IsIso8601Date(r.PlannedEnd));
    }

    private static bool IsIso8601Date(string raw) =>
        !string.IsNullOrWhiteSpace(raw) && DateOnly.TryParseExact(raw, "yyyy-MM-dd", out _);

    private static bool IsRealReleaseYear(string raw)
    {
        if (!DateOnly.TryParseExact(raw, "yyyy-MM-dd", out var d))
            return true;
        return d.Year >= MinYear && d.Year <= MaxYear;
    }

    private static bool HasValidDateOrder(string startRaw, string endRaw)
    {
        if (!DateOnly.TryParseExact(startRaw, "yyyy-MM-dd", out var s)) return true;
        if (!DateOnly.TryParseExact(endRaw, "yyyy-MM-dd", out var e)) return true;
        return e >= s;
    }
}
