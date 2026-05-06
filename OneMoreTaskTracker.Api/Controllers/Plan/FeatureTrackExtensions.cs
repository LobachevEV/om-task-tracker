using OneMoreTaskTracker.Proto.Features;

namespace OneMoreTaskTracker.Api.Controllers.Plan;

internal static class FeatureTrackExtensions
{
    internal static string ToWireString(this FeatureTrackKind kind) =>
        kind switch
        {
            FeatureTrackKind.Frontend => "Frontend",
            FeatureTrackKind.Backend  => "Backend",
            _                        => "Unknown",
        };

    internal static string ToWireString(this FeatureTrackStageKey key) =>
        key switch
        {
            FeatureTrackStageKey.TrackStageSrApproving    => "SrApproving",
            FeatureTrackStageKey.TrackStageCsApproving    => "CsApproving",
            FeatureTrackStageKey.TrackStageDevelopment    => "Development",
            FeatureTrackStageKey.TrackStageStandTesting   => "StandTesting",
            FeatureTrackStageKey.TrackStageEthalonTesting => "EthalonTesting",
            FeatureTrackStageKey.TrackStageReleaseToLive  => "ReleaseToLive",
            _                                             => "Unknown",
        };
}
