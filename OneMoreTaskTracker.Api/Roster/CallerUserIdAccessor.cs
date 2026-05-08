using FluentValidation;

namespace OneMoreTaskTracker.Api.Roster;

public static class CallerUserIdAccessor
{
    private const string Key = "CallerUserId";

    public static void SetCallerUserId<T>(this ValidationContext<T> context, int callerUserId) =>
        context.RootContextData[Key] = callerUserId;

    public static int? TryGetCallerUserId(IValidationContext context) =>
        context.RootContextData.TryGetValue(Key, out var value) && value is int id ? id : null;
}
