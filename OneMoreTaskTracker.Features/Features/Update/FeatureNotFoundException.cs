namespace OneMoreTaskTracker.Features.Features.Update;

public sealed class FeatureNotFoundException(int featureId)
    : Exception($"feature {featureId} not found")
{
    public int FeatureId { get; } = featureId;
}
