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

        AddDateRules(p => p.CsApprovingPlannedStart);
        AddDateRules(p => p.CsApprovingPlannedEnd);
        AddDateRules(p => p.DevelopmentPlannedStart);
        AddDateRules(p => p.DevelopmentPlannedEnd);
        AddDateRules(p => p.TestingPlannedStart);
        AddDateRules(p => p.TestingPlannedEnd);
        AddDateRules(p => p.EthalonTestingPlannedStart);
        AddDateRules(p => p.EthalonTestingPlannedEnd);
        AddDateRules(p => p.LiveReleasePlannedStart);
        AddDateRules(p => p.LiveReleasePlannedEnd);
    }

    private void AddDateRules(System.Linq.Expressions.Expression<Func<UpdateFeaturePayload, string?>> selector)
    {
        RuleFor(selector)
            .Must(PlanRequestHelpers.IsValidOptionalDate)
            .When(p => !string.IsNullOrEmpty(selector.Compile()(p)))
            .WithMessage(PlanRequestHelpers.DateFormatError);

        RuleFor(selector)
            .Must(PlanRequestHelpers.IsInDateWindow)
            .When(p => PlanRequestHelpers.TryParseIsoDate(selector.Compile()(p), out _))
            .WithMessage(PlanRequestHelpers.DateRangeError);
    }
}
