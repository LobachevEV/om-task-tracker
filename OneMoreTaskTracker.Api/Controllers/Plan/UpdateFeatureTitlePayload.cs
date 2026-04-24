using System.ComponentModel.DataAnnotations;

namespace OneMoreTaskTracker.Api.Controllers;

// Inline-edit payload for PATCH /api/plan/features/{id}/title.
// Title is trimmed server-side; empty-after-trim is rejected downstream as 400.
public record UpdateFeatureTitlePayload(
    [Required, MaxLength(200)] string Title);
