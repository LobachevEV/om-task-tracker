using System.Text.Json;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Tracks;

public record PatchFeatureTrackPayload(
    JsonElement? TrackOwnerUserId,
    int? ExpectedVersion);
