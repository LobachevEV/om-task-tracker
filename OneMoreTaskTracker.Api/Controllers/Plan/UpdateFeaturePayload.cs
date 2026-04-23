using System.ComponentModel.DataAnnotations;

namespace OneMoreTaskTracker.Api.Controllers;

public record UpdateFeaturePayload(
    [MaxLength(200)] string? Title,
    [MaxLength(4000)] string? Description,
    int? LeadUserId,
    string? PlannedStart,
    string? PlannedEnd,
    string? State,
    IReadOnlyList<StagePlanPayload>? StagePlans);
