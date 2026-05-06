using OneMoreTaskTracker.Proto.Features;

namespace OneMoreTaskTracker.Api.Controllers.Plan;

internal static class TrackStageKeyParser
{
    internal static bool TryParse(string raw, out FeatureTrackStageKey key)
    {
        key = default;
        if (string.IsNullOrWhiteSpace(raw))
            return false;

        key = raw.ToLowerInvariant() switch
        {
            "srapproving"    => FeatureTrackStageKey.TrackStageSrApproving,
            "csapproving"    => FeatureTrackStageKey.TrackStageCsApproving,
            "development"    => FeatureTrackStageKey.TrackStageDevelopment,
            "standtesting"   => FeatureTrackStageKey.TrackStageStandTesting,
            "ethalontesting" => FeatureTrackStageKey.TrackStageEthalonTesting,
            "releasetolive"  => FeatureTrackStageKey.TrackStageReleaseToLive,
            _                => FeatureTrackStageKey.TrackStageKeyUnspecified,
        };
        return key != FeatureTrackStageKey.TrackStageKeyUnspecified;
    }
}
