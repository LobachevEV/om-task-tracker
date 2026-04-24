namespace OneMoreTaskTracker.Api.Controllers;

// Inline-edit payload for PATCH /api/plan/features/{id}/stages/{stage}/owner.
// `null` clears the owner; otherwise the user id must be on the manager's
// roster (validated gateway-side before forwarding to the Features service).
// Role-prefixed naming per microservices/contracts.md.
public record UpdateStageOwnerPayload(int? StageOwnerUserId);
