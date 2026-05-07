using System.Text.Json.Serialization;
using OneMoreTaskTracker.Api.Controllers.Plan;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Tracks;

public record PatchFeatureTrackPayload(
    [property: JsonConverter(typeof(TristateIntJsonConverter))] Tristate<int>? TrackOwnerUserId,
    int? ExpectedVersion);
