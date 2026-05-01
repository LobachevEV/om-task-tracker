namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Taxonomy;

public record FeatureGateResponse(
    int Id,
    string GateKey,
    string Kind,
    string? Track,
    string Status,
    int? ApproverUserId,
    string? ApprovedAtUtc,
    string? RequestedAtUtc,
    string? RejectionReason,
    int Version);
