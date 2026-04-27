using System.ComponentModel.DataAnnotations;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Fields;

// Inline-edit payload for PATCH /api/plan/features/{id}/description.
// `null` clears the field; empty string "" is coerced to null server-side.
public record UpdateFeatureDescriptionPayload(
    [MaxLength(4000)] string? Description);
