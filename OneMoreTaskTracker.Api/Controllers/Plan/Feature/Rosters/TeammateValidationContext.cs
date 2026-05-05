using FluentValidation;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Rosters;

public static class TeammateValidationContext
{
    private const string CallerUserIdKey = "TeammateRoster.CallerUserId";

    public static ValidationContext<IHasTeammateUserId> ForCaller(IHasTeammateUserId payload, int callerUserId)
    {
        var ctx = new ValidationContext<IHasTeammateUserId>(payload);
        ctx.RootContextData[CallerUserIdKey] = callerUserId;
        return ctx;
    }

    public static int CallerUserId(this ValidationContext<IHasTeammateUserId> ctx) =>
        (int)ctx.RootContextData[CallerUserIdKey];
}
