using FluentValidation;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Rosters;

public sealed class TeammateRosterValidator : AbstractValidator<IHasTeammateUserId>
{
    public const string PickATeammateError = "Pick a teammate from the list";

    public TeammateRosterValidator(ITeamRosterProvider rosterProvider)
    {
        When(p => p.TeammateUserId is not null, () =>
        {
            RuleFor(p => p.TeammateUserId!.Value)
                .Cascade(CascadeMode.Stop)
                .GreaterThanOrEqualTo(1)
                .WithMessage(PlanRequestHelpers.InvalidRequest)
                .MustAsync(async (_, value, ctx, ct) =>
                    await rosterProvider.IsTeammateOfManagerAsync(ctx.CallerUserId(), value, ct))
                .WithMessage(PickATeammateError);
        });
    }
}
