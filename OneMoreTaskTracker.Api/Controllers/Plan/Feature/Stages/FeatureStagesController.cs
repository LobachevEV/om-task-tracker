using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Proto.Features.UpdateStageOwnerCommand;
using OneMoreTaskTracker.Proto.Features.UpdateStagePlannedEndCommand;
using OneMoreTaskTracker.Proto.Features.UpdateStagePlannedStartCommand;
using OneMoreTaskTracker.Proto.Users;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Stages;

[ApiController]
[Authorize(Roles = Roles.Manager)]
[Route("api/plan/features/{id:int}/stages/{stage}")]
public class FeatureStagesController(
    StageOwnerUpdater.StageOwnerUpdaterClient stageOwnerUpdater,
    StagePlannedStartUpdater.StagePlannedStartUpdaterClient stagePlannedStartUpdater,
    StagePlannedEndUpdater.StagePlannedEndUpdaterClient stagePlannedEndUpdater,
    UserService.UserServiceClient userService,
    ILogger<FeatureStagesController> logger) : ControllerBase
{
    [HttpPatch("owner")]
    public async Task<ActionResult<FeatureSummaryResponse>> UpdateOwner(
        int id,
        string stage,
        [FromBody] UpdateStageOwnerPayload body,
        [FromHeader(Name = "If-Match")] string? ifMatch,
        CancellationToken ct)
    {
        if (!PlanMapper.TryParseStage(stage, out var parsedStage))
            return BadRequest(new { error = PlanRequestHelpers.InvalidRequest });

        var callerUserId = User.GetUserId();

        // null clears the assignment. For non-null ids: reject malformed (<1)
        // and gate against the manager's roster — closes the typed-in rogue-id
        // path since FE pickers are roster-sourced (composed here, not east-west).
        if (body.StageOwnerUserId is { } ownerId)
        {
            if (ownerId < 1)
                return BadRequest(new { error = PlanRequestHelpers.InvalidRequest });

            var roster = await userService.LoadRosterForManagerAsync(callerUserId, logger, ct);
            if (!roster.ContainsKey(ownerId))
                return BadRequest(new { error = "Pick a teammate from the list" });
        }

        var expectedStageVersion = PlanRequestHelpers.ParseIfMatch(ifMatch, logger);

        var request = new UpdateStageOwnerRequest
        {
            FeatureId = id,
            Stage = parsedStage,
            StageOwnerUserId = body.StageOwnerUserId ?? 0,
            CallerUserId = callerUserId,
        };
        if (expectedStageVersion.HasValue)
            request.ExpectedStageVersion = expectedStageVersion.Value;

        var dto = await stageOwnerUpdater.UpdateAsync(request, cancellationToken: ct);

        return Ok(PlanMapper.MapSummary(dto, PlanRequestHelpers.EmptyTasks, logger));
    }

    [HttpPatch("planned-start")]
    public async Task<ActionResult<FeatureSummaryResponse>> UpdatePlannedStart(
        int id,
        string stage,
        [FromBody] UpdateStagePlannedStartPayload body,
        [FromHeader(Name = "If-Match")] string? ifMatch,
        CancellationToken ct)
    {
        if (!PlanMapper.TryParseStage(stage, out var parsedStage))
            return BadRequest(new { error = PlanRequestHelpers.InvalidRequest });

        if (PlanMapper.ValidateOptionalReleaseDate(body.PlannedStart) is { } dateError)
            return BadRequest(new { error = dateError });

        var callerUserId = User.GetUserId();
        var expectedStageVersion = PlanRequestHelpers.ParseIfMatch(ifMatch, logger);

        var request = new UpdateStagePlannedStartRequest
        {
            FeatureId = id,
            Stage = parsedStage,
            PlannedStart = body.PlannedStart ?? string.Empty,
            CallerUserId = callerUserId,
        };
        if (expectedStageVersion.HasValue)
            request.ExpectedStageVersion = expectedStageVersion.Value;

        var dto = await stagePlannedStartUpdater.UpdateAsync(request, cancellationToken: ct);

        return Ok(PlanMapper.MapSummary(dto, PlanRequestHelpers.EmptyTasks, logger));
    }

    [HttpPatch("planned-end")]
    public async Task<ActionResult<FeatureSummaryResponse>> UpdatePlannedEnd(
        int id,
        string stage,
        [FromBody] UpdateStagePlannedEndPayload body,
        [FromHeader(Name = "If-Match")] string? ifMatch,
        CancellationToken ct)
    {
        if (!PlanMapper.TryParseStage(stage, out var parsedStage))
            return BadRequest(new { error = PlanRequestHelpers.InvalidRequest });

        if (PlanMapper.ValidateOptionalReleaseDate(body.PlannedEnd) is { } dateError)
            return BadRequest(new { error = dateError });

        var callerUserId = User.GetUserId();
        var expectedStageVersion = PlanRequestHelpers.ParseIfMatch(ifMatch, logger);

        var request = new UpdateStagePlannedEndRequest
        {
            FeatureId = id,
            Stage = parsedStage,
            PlannedEnd = body.PlannedEnd ?? string.Empty,
            CallerUserId = callerUserId,
        };
        if (expectedStageVersion.HasValue)
            request.ExpectedStageVersion = expectedStageVersion.Value;

        var dto = await stagePlannedEndUpdater.UpdateAsync(request, cancellationToken: ct);

        return Ok(PlanMapper.MapSummary(dto, PlanRequestHelpers.EmptyTasks, logger));
    }
}
