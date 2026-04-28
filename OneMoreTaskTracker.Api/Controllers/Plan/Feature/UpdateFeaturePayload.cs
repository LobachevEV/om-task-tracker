using System.ComponentModel.DataAnnotations;
using OneMoreTaskTracker.Api.Controllers.Plan.Feature.Stages;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature;

public record UpdateFeaturePayload(
    [MaxLength(200)] string? Title,
    [MaxLength(4000)] string? Description,
    int? LeadUserId,
    string? PlannedStart,
    string? PlannedEnd,
    string? State,
    IReadOnlyList<StagePlanPayload>? StagePlans,
    int? ExpectedVersion = null);
