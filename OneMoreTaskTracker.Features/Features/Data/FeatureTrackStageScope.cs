using OneMoreTaskTracker.Proto.Features;

namespace OneMoreTaskTracker.Features.Features.Data;

public static class FeatureTrackStageScope
{
    private static readonly IReadOnlyList<FeatureTrackStageKey> FrontendKeys =
    [
        FeatureTrackStageKey.TrackStageSrApproving,
        FeatureTrackStageKey.TrackStageDevelopment,
        FeatureTrackStageKey.TrackStageStandTesting,
        FeatureTrackStageKey.TrackStageEthalonTesting,
        FeatureTrackStageKey.TrackStageReleaseToLive,
    ];

    private static readonly IReadOnlyList<FeatureTrackStageKey> BackendKeys =
    [
        FeatureTrackStageKey.TrackStageCsApproving,
        FeatureTrackStageKey.TrackStageDevelopment,
        FeatureTrackStageKey.TrackStageStandTesting,
        FeatureTrackStageKey.TrackStageEthalonTesting,
        FeatureTrackStageKey.TrackStageReleaseToLive,
    ];

    public static IReadOnlyList<FeatureTrackStageKey> AdmittedKeys(FeatureTrackKind kind) =>
        kind == FeatureTrackKind.Frontend ? FrontendKeys : BackendKeys;

    public static bool IsAdmittedFor(FeatureTrackKind kind, FeatureTrackStageKey stageKey) =>
        AdmittedKeys(kind).Contains(stageKey);
}
