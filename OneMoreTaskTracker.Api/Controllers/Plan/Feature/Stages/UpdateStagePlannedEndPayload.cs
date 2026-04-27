namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Stages;

// Inline-edit payload for PATCH /api/plan/features/{id}/stages/{stage}/planned-end.
// ISO yyyy-MM-dd string OR null to clear.
public record UpdateStagePlannedEndPayload(string? PlannedEnd);
