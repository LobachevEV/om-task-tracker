using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Api.Controllers.Plan;
using OneMoreTaskTracker.Api.Controllers.Plan.Feature;
using OneMoreTaskTracker.Proto.Features;
using OneMoreTaskTracker.Proto.Features.UpdateFeatureDescriptionCommand;
using OneMoreTaskTracker.Proto.Features.UpdateFeatureLeadCommand;
using OneMoreTaskTracker.Proto.Features.UpdateFeatureTitleCommand;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Fields;

[ApiController]
[Authorize(Roles = Roles.Manager)]
[Route("api/plan/features/{id:int}")]
public class FeatureFieldsController(
    FeatureTitleUpdater.FeatureTitleUpdaterClient featureTitleUpdater,
    FeatureDescriptionUpdater.FeatureDescriptionUpdaterClient featureDescriptionUpdater,
    FeatureLeadUpdater.FeatureLeadUpdaterClient featureLeadUpdater,
    ILogger<FeatureFieldsController> logger) : ControllerBase
{
    [HttpPatch("title")]
    public async Task<ActionResult<FeatureSummaryResponse>> UpdateTitle(
        int id,
        [FromBody] UpdateFeatureTitlePayload body,
        [FromHeader(Name = "If-Match")] string? ifMatch,
        CancellationToken ct)
    {
        if (!ModelState.IsValid || string.IsNullOrWhiteSpace(body.Title))
            return BadRequest(new { error = PlanRequestHelpers.InvalidRequest });

        var callerUserId = User.GetUserId();
        var expectedVersion = PlanRequestHelpers.ParseIfMatch(ifMatch, logger);

        var request = new UpdateFeatureTitleRequest
        {
            Id = id,
            Title = body.Title,
            CallerUserId = callerUserId,
        };
        if (expectedVersion.HasValue)
            request.ExpectedVersion = expectedVersion.Value;

        var dto = await featureTitleUpdater.UpdateAsync(request, cancellationToken: ct);

        return Ok(PlanMapper.MapSummary(dto, PlanRequestHelpers.EmptyTasks, logger));
    }

    [HttpPatch("description")]
    public async Task<ActionResult<FeatureSummaryResponse>> UpdateDescription(
        int id,
        [FromBody] UpdateFeatureDescriptionPayload body,
        [FromHeader(Name = "If-Match")] string? ifMatch,
        CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(new { error = PlanRequestHelpers.InvalidRequest });

        var callerUserId = User.GetUserId();
        var expectedVersion = PlanRequestHelpers.ParseIfMatch(ifMatch, logger);

        var request = new UpdateFeatureDescriptionRequest
        {
            Id = id,
            Description = body.Description ?? string.Empty,
            CallerUserId = callerUserId,
        };
        if (expectedVersion.HasValue)
            request.ExpectedVersion = expectedVersion.Value;

        var dto = await featureDescriptionUpdater.UpdateAsync(request, cancellationToken: ct);

        return Ok(PlanMapper.MapSummary(dto, PlanRequestHelpers.EmptyTasks, logger));
    }

    [HttpPatch("lead")]
    public async Task<ActionResult<FeatureSummaryResponse>> UpdateLead(
        int id,
        [FromBody] UpdateFeatureLeadPayload body,
        [FromHeader(Name = "If-Match")] string? ifMatch,
        CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(new { error = PlanRequestHelpers.InvalidRequest });

        var callerUserId = User.GetUserId();
        var expectedVersion = PlanRequestHelpers.ParseIfMatch(ifMatch, logger);

        var request = new UpdateFeatureLeadRequest
        {
            Id = id,
            LeadUserId = body.LeadUserId,
            CallerUserId = callerUserId,
        };
        if (expectedVersion.HasValue)
            request.ExpectedVersion = expectedVersion.Value;

        var dto = await featureLeadUpdater.UpdateAsync(request, cancellationToken: ct);

        return Ok(PlanMapper.MapSummary(dto, PlanRequestHelpers.EmptyTasks, logger));
    }
}
