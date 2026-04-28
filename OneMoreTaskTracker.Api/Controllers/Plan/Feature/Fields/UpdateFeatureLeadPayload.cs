using System.ComponentModel.DataAnnotations;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Fields;

public record UpdateFeatureLeadPayload(
    [Range(1, int.MaxValue)] int LeadUserId);
