using System.Text.Json.Serialization;
using OneMoreTaskTracker.Api.Controllers.Plan;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Tracks;

public record PatchFeatureTrackStagePayload(
    [property: JsonConverter(typeof(TristateIntJsonConverter))] Tristate<int>? StageOwnerUserId,
    string? PlannedStart,
    string? PlannedEnd,
    int? ExpectedStageVersion);
