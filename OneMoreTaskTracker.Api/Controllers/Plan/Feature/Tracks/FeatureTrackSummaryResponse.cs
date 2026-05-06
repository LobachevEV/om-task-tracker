using OneMoreTaskTracker.Api.Controllers.Plan;
using OneMoreTaskTracker.Proto.Features;
using OneMoreTaskTracker.Proto.Users;

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
            track.Stages.Select(s => StageFrom(s, null)).ToList());

    internal static FeatureTrackDetailResponse FromDetail(
        FeatureTrackDto track,
        IReadOnlyDictionary<int, TeamRosterMember> roster)
    {
        var trackOwner = track.TrackOwnerUserId > 0 && roster.ContainsKey(track.TrackOwnerUserId)
            ? MiniTeamMemberResponse.From(track.TrackOwnerUserId, roster)
            : null;

        return new FeatureTrackDetailResponse(
            track.Id,
            track.FeatureId,
            track.Kind.ToWireString(),
            track.TrackOwnerUserId,
            trackOwner,
            track.Version,
            track.Stages.Select(s => StageFrom(s, roster)).ToList());
    }

    private static FeatureTrackStageResponse StageFrom(
        FeatureTrackStageDto s,
        IReadOnlyDictionary<int, TeamRosterMember>? roster)
    {
        var ownerUserId = s.StageOwnerUserId == 0 ? null : (int?)s.StageOwnerUserId;
        var stageOwner  = ownerUserId.HasValue && roster is not null
            ? MiniTeamMemberResponse.From(ownerUserId.Value, roster)
            : null;

        return new FeatureTrackStageResponse(
            s.StageKey.ToWireString(),
            string.IsNullOrEmpty(s.PlannedStart) ? null : s.PlannedStart,
            string.IsNullOrEmpty(s.PlannedEnd)   ? null : s.PlannedEnd,
            ownerUserId,
            stageOwner,
            s.StageVersion);
    }
}
