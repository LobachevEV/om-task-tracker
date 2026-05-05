namespace OneMoreTaskTracker.Features.Features.Update;

public sealed class OptimisticConcurrencyConflictException(int currentVersion)
    : Exception($"version conflict: current version is {currentVersion}")
{
    public int CurrentVersion { get; } = currentVersion;
}
