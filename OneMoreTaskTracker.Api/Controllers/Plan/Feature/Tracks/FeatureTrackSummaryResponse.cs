using OneMoreTaskTracker.Api.Controllers.Plan;
using OneMoreTaskTracker.Proto.Features;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Tracks;

public record FeatureTrackSummaryResponse(
    int Id,
    int FeatureId,
    string Kind,
    int TrackOwnerUserId,
    int Version,
    IReadOnlyList<FeatureTrackStageResponse> Stages)
{
    internal static FeatureTrackSummaryResponse From(FeatureTrackDto track) =>
        new(
            track.Id,
            track.FeatureId,
            track.Kind.ToWireString(),
            track.TrackOwnerUserId,
            track.Version,
            track.Stages.Select(StageFrom).ToList());

    private static FeatureTrackStageResponse StageFrom(FeatureTrackStageDto s) =>
        new(
            s.StageKey.ToWireString(),
            string.IsNullOrEmpty(s.PlannedStart) ? null : s.PlannedStart,
            string.IsNullOrEmpty(s.PlannedEnd)   ? null : s.PlannedEnd,
            s.StageOwnerUserId == 0               ? null : s.StageOwnerUserId,
            s.StageVersion);
}
