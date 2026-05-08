using FluentValidation;
using OneMoreTaskTracker.Api.Roster;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Tracks;

public sealed class PatchFeatureTrackPayloadValidator : AbstractValidator<PatchFeatureTrackPayload>
{
    public PatchFeatureTrackPayloadValidator(ITeamRosterProvider rosterProvider)
    {
        When(p => p.TrackOwnerUserId is { IsPresent: true, Value: not null }, () =>
        {
            RuleFor(p => p.TrackOwnerUserId!.Value)
                .GreaterThan(0).WithMessage(PlanRequestHelpers.InvalidRequest);
            RuleFor(p => p.TeamMemberId)
                .MustBeOnCallerRoster(rosterProvider);
        });
    }
}
