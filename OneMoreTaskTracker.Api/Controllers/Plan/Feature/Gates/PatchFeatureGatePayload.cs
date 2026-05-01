namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Gates;

public record PatchFeatureGatePayload(
    string? Status,
    string? RejectionReason,
    int? ExpectedVersion);
