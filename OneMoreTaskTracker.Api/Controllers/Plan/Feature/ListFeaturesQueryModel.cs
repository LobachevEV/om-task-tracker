using Microsoft.AspNetCore.Mvc;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature;

public sealed record ListFeaturesQueryModel(
    [FromQuery(Name = "scope")] string? Scope,
    [FromQuery(Name = "state")] string? State,
    [FromQuery(Name = "windowStart")] string? WindowStart,
    [FromQuery(Name = "windowEnd")] string? WindowEnd);
