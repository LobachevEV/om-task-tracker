using FluentValidation;
using OneMoreTaskTracker.Proto.Features.ListFeaturesQuery;

namespace OneMoreTaskTracker.Features.Features.List;

public sealed class ListFeaturesRequestValidator : AbstractValidator<ListFeaturesRequest>
{
    public ListFeaturesRequestValidator()
    {
        When(r => !string.IsNullOrWhiteSpace(r.WindowStart), () =>
        {
            RuleFor(r => r.WindowStart)
                .Must(IsIso8601Date)
                .WithMessage("window_* must be YYYY-MM-DD");
        });

        When(r => !string.IsNullOrWhiteSpace(r.WindowEnd), () =>
        {
            RuleFor(r => r.WindowEnd)
                .Must(IsIso8601Date)
                .WithMessage("window_* must be YYYY-MM-DD");
        });
    }

    private static bool IsIso8601Date(string raw) =>
        DateOnly.TryParseExact(raw, "yyyy-MM-dd", out _);
}
