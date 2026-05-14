using FluentValidation;
using OneMoreTaskTracker.Api.Roster;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature;

public sealed class UpdateFeaturePayloadValidator : AbstractValidator<UpdateFeaturePayload>
{
    public UpdateFeaturePayloadValidator(ITeamRosterProvider rosterProvider)
    {
        When(p => p.LeadUserId.HasValue, () =>
        {
            RuleFor(p => p.LeadUserId)
                .GreaterThan(0).WithMessage(PlanRequestHelpers.InvalidRequest)
                .MustBeOnCallerRoster(rosterProvider);
        });

    }
}
