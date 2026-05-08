using FluentValidation;

namespace OneMoreTaskTracker.Api.Roster;

public static class HasTeamMemberIdRule
{
    public static IRuleBuilderOptions<T, int?> MustBeOnCallerRoster<T>(
        this IRuleBuilder<T, int?> rule,
        ITeamRosterProvider rosterProvider) where T : IHasTeamMemberId =>
        rule.MustAsync(async (_, memberId, validationContext, ct) =>
        {
            if (memberId is null)
                return true;

            var callerUserId = CallerUserIdAccessor.TryGetCallerUserId(validationContext);
            if (callerUserId is null)
                return false;

            return await rosterProvider.IsTeamMemberAsync(callerUserId.Value, memberId.Value, ct);
        })
        .WithMessage("Pick a teammate from the list");
}
