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

    private static readonly IReadOnlyDictionary<FeatureTrackStageKey, string> WireNameMap =
        new Dictionary<FeatureTrackStageKey, string>
        {
            [FeatureTrackStageKey.TrackStageSrApproving]    = "SrApproving",
            [FeatureTrackStageKey.TrackStageCsApproving]    = "CsApproving",
            [FeatureTrackStageKey.TrackStageDevelopment]    = "Development",
            [FeatureTrackStageKey.TrackStageStandTesting]   = "StandTesting",
            [FeatureTrackStageKey.TrackStageEthalonTesting] = "EthalonTesting",
            [FeatureTrackStageKey.TrackStageReleaseToLive]  = "ReleaseToLive",
        };

    public static IReadOnlyList<FeatureTrackStageKey> AdmittedKeys(FeatureTrackKind kind) =>
        kind == FeatureTrackKind.Frontend ? FrontendKeys : BackendKeys;

    public static IReadOnlyList<string> AdmittedWireNames(FeatureTrackKind kind) =>
        AdmittedKeys(kind)
            .Select(k => WireNameMap.TryGetValue(k, out var name) ? name : k.ToString())
            .ToList();

    public static bool IsAdmittedFor(FeatureTrackKind kind, FeatureTrackStageKey stageKey) =>
        AdmittedKeys(kind).Contains(stageKey);
}
