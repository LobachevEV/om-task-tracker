namespace OneMoreTaskTracker.Api.Controllers;

// Inline-edit payload for PATCH /api/plan/features/{id}/stages/{stage}/planned-start.
// ISO yyyy-MM-dd string OR null to clear. Server enforces year bounds
// (2000..2100) and per-stage start <= end ordering.
public record UpdateStagePlannedStartPayload(string? PlannedStart);
