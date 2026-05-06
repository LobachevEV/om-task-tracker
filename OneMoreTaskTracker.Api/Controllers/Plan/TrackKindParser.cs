using OneMoreTaskTracker.Proto.Features;

namespace OneMoreTaskTracker.Api.Controllers.Plan;

internal static class TrackKindParser
{
    internal static bool TryParse(string raw, out FeatureTrackKind kind)
    {
        kind = default;
        if (string.IsNullOrWhiteSpace(raw))
            return false;

        if (string.Equals(raw, "frontend", StringComparison.OrdinalIgnoreCase))
        {
            kind = FeatureTrackKind.Frontend;
            return true;
        }
        if (string.Equals(raw, "backend", StringComparison.OrdinalIgnoreCase))
        {
            kind = FeatureTrackKind.Backend;
            return true;
        }
        return false;
    }
}
