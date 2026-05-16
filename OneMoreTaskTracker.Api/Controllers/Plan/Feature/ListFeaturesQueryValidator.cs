using FluentValidation;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature;

public sealed class ListFeaturesQueryValidator : AbstractValidator<ListFeaturesQueryModel>
{
    public ListFeaturesQueryValidator()
    {
        RuleFor(q => q.Scope)
            .Must(s => ListScopeParser.TryParse(s, out _))
            .WithMessage("Invalid scope; expected 'all' or 'mine'");
    }
}
