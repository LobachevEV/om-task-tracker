using OneMoreTaskTracker.Proto.Features;

namespace OneMoreTaskTracker.Api.Controllers.Plan;

internal static class FeatureStateExtensions
{
    internal static string ToWireString(this FeatureState state) =>
        Enum.GetName(state) ?? "Unknown";
}
