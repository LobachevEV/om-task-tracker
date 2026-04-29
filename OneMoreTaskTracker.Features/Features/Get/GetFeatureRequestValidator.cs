using FluentValidation;
using OneMoreTaskTracker.Proto.Features.GetFeatureQuery;

namespace OneMoreTaskTracker.Features.Features.Get;

public sealed class GetFeatureRequestValidator : AbstractValidator<GetFeatureRequest>
{
    public GetFeatureRequestValidator()
    {
        RuleFor(r => r.Id)
            .GreaterThan(0)
            .WithMessage("id is required");
    }
}
