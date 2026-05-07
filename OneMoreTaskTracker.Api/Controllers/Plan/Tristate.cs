namespace OneMoreTaskTracker.Api.Controllers.Plan;

public sealed record Tristate<T>(bool IsPresent, T? Value)
    where T : struct;
