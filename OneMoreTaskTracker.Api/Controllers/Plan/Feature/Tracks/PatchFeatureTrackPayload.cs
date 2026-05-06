namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Tracks;

public record PatchFeatureTrackPayload(
    int? TrackOwnerUserId,
    int? ExpectedVersion);
