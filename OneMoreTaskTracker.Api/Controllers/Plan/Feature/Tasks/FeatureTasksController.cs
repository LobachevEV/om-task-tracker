using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Proto.Features.GetFeatureQuery;
using OneMoreTaskTracker.Proto.Tasks.AttachTaskCommand;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Tasks;

[ApiController]
[Authorize(Roles = Roles.Manager)]
[Route("api/plan/features/{id:int}/tasks")]
public class FeatureTasksController(
    FeatureGetter.FeatureGetterClient featureGetter,
    TaskFeatureLinker.TaskFeatureLinkerClient taskFeatureLinker,
    ILogger<FeatureTasksController> logger) : ControllerBase
{
    [HttpPost("{jiraId}")]
    public async Task<ActionResult<FeatureSummaryResponse>> Attach(
        int id,
        string jiraId,
        CancellationToken ct)
    {
        // Cross-service composition: Tasks can't validate the foreign feature id
        // (different schema, owned by Features). Pre-fetching here is the gateway's
        // job per composition.md; a NotFound surfaces via GrpcExceptionMiddleware.
        var feature = await featureGetter.GetAsync(
            new GetFeatureRequest { Id = id },
            cancellationToken: ct);

        await taskFeatureLinker.AttachAsync(
            new AttachTaskToFeatureRequest { JiraTaskId = jiraId, FeatureId = id },
            cancellationToken: ct);

        return Ok(PlanMapper.MapSummary(feature, PlanRequestHelpers.EmptyTasks, logger));
    }

    [HttpDelete("{jiraId}")]
    public async Task<ActionResult<FeatureSummaryResponse>> Detach(
        int id,
        string jiraId,
        [FromBody] DetachTaskBody? body,
        CancellationToken ct)
    {
        if (body is null || body.ReassignToFeatureId <= 0)
            return UnprocessableEntity(new { error = "reassignToFeatureId is required" });

        var detach = taskFeatureLinker.DetachAsync(
            new DetachTaskFromFeatureRequest
            {
                JiraTaskId = jiraId,
                ReassignToFeatureId = body.ReassignToFeatureId
            }, cancellationToken: ct).ResponseAsync;
        var get = featureGetter.GetAsync(
            new GetFeatureRequest { Id = id },
            cancellationToken: ct).ResponseAsync;

        await Task.WhenAll(detach, get);

        return Ok(PlanMapper.MapSummary(get.Result, PlanRequestHelpers.EmptyTasks, logger));
    }
}
