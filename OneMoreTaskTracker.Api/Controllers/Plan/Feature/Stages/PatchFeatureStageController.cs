using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Api.Controllers.Plan.Feature;
using OneMoreTaskTracker.Proto.Features.PatchFeatureStageCommand;
using OneMoreTaskTracker.Proto.Users;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Stages;

[ApiController]
[Authorize(Roles = Roles.Manager)]
[Route("api/plan/features/{id:int}/stages/{stage}")]
public class PatchFeatureStageController(
    FeatureStagePatcher.FeatureStagePatcherClient featureStagePatcher,
    UserService.UserServiceClient userService,
    ILogger<PatchFeatureStageController> logger) : ControllerBase
{
    [HttpPatch("")]
    public async Task<ActionResult<FeatureSummaryResponse>> Patch(
        int id,
        string stage,
        [FromBody] PatchFeatureStagePayload body,
        [FromHeader(Name = "If-Match")] string? ifMatch,
        CancellationToken ct)
    {
        if (!FeatureStateMapper.TryParseStage(stage, out var parsedStage))
            return BadRequest(new { error = PlanRequestHelpers.InvalidRequest });

        if (body.PlannedStart is not null
            && ReleaseDateValidator.Validate(body.PlannedStart) is { } startError)
            return BadRequest(new { error = startError });

        if (body.PlannedEnd is not null
            && ReleaseDateValidator.Validate(body.PlannedEnd) is { } endError)
            return BadRequest(new { error = endError });

        var callerUserId = User.GetUserId();

        if (body.StageOwnerUserId is { } ownerId)
        {
            if (ownerId < 1)
                return BadRequest(new { error = PlanRequestHelpers.InvalidRequest });

            var roster = await userService.LoadRosterForManagerAsync(callerUserId, logger, ct);
            if (!roster.ContainsKey(ownerId))
                return BadRequest(new { error = "Pick a teammate from the list" });
        }

        var headerVersion = PlanRequestHelpers.ParseIfMatch(ifMatch, logger);
        var expectedStageVersion = body.ExpectedStageVersion ?? headerVersion;

        var request = new PatchFeatureStageRequest
        {
            FeatureId = id,
            Stage = parsedStage,
            CallerUserId = callerUserId,
        };

        if (body.StageOwnerUserId is { } owner)
            request.StageOwnerUserId = owner;

        if (body.PlannedStart is not null)
            request.PlannedStart = body.PlannedStart;

        if (body.PlannedEnd is not null)
            request.PlannedEnd = body.PlannedEnd;

        if (expectedStageVersion.HasValue)
            request.ExpectedStageVersion = expectedStageVersion.Value;

        var dto = await featureStagePatcher.PatchAsync(request, cancellationToken: ct);
        return Ok(FeatureSummaryBuilder.MapSummary(dto, PlanRequestHelpers.EmptyTasks, logger));
    }
}
