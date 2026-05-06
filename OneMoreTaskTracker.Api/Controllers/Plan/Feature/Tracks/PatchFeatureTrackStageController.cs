using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Api.Controllers.Plan.Feature;
using OneMoreTaskTracker.Proto.Features.GetFeatureQuery;
using OneMoreTaskTracker.Proto.Features.PatchFeatureTrackStageCommand;
using OneMoreTaskTracker.Proto.Users;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Tracks;

[ApiController]
[Authorize(Roles = Roles.Manager)]
[Route("api/plan/features/{featureId:int}/tracks/{kind}/stages/{stageKey}")]
public class PatchFeatureTrackStageController(
    FeatureTrackStagePatcher.FeatureTrackStagePatcherClient featureTrackStagePatcher,
    FeatureGetter.FeatureGetterClient featureGetter,
    UserService.UserServiceClient userService,
    ILogger<PatchFeatureTrackStageController> logger) : ControllerBase
{
    [HttpPatch("")]
    public async Task<ActionResult<FeatureSummaryResponse>> Patch(
        int featureId,
        string kind,
        string stageKey,
        [FromBody] PatchFeatureTrackStagePayload body,
        [FromHeader(Name = "If-Match")] string? ifMatch,
        CancellationToken ct)
    {
        if (!TrackKindParser.TryParse(kind, out var parsedKind))
            return BadRequest(new { error = PlanRequestHelpers.InvalidRequest });

        if (!TrackStageKeyParser.TryParse(stageKey, out var parsedStageKey))
            return BadRequest(new { error = PlanRequestHelpers.InvalidRequest });

        if (body.PlannedStart is { } rawStart &&
            !DateOnly.TryParseExact(rawStart, "yyyy-MM-dd", out _))
            return BadRequest(new { error = PlanRequestHelpers.InvalidRequest });

        if (body.PlannedEnd is { } rawEnd &&
            !DateOnly.TryParseExact(rawEnd, "yyyy-MM-dd", out _))
            return BadRequest(new { error = PlanRequestHelpers.InvalidRequest });

        var callerUserId = User.GetUserId();
        var (ownerHasValue, ownerProtoValue) = PlanRequestHelpers.DecodeOwnerField(body.StageOwnerUserId);

        if (ownerHasValue && ownerProtoValue == 0)
            return BadRequest(new { error = PlanRequestHelpers.InvalidRequest });

        if (ownerHasValue && ownerProtoValue > 0)
        {
            var roster = await userService.LoadRosterForManagerAsync(callerUserId, logger, ct);
            if (!roster.ContainsKey(ownerProtoValue))
                return BadRequest(new { error = "Pick a teammate from the list" });
        }

        var headerVersion = PlanRequestHelpers.ParseIfMatch(ifMatch, logger);
        var expectedVersion = body.ExpectedStageVersion ?? headerVersion;

        var request = new PatchFeatureTrackStageRequest
        {
            FeatureId    = featureId,
            Kind         = parsedKind,
            StageKey     = parsedStageKey,
            CallerUserId = callerUserId,
        };

        if (ownerHasValue)
            request.StageOwnerUserId = ownerProtoValue;

        if (expectedVersion.HasValue)
            request.ExpectedStageVersion = expectedVersion.Value;

        if (body.PlannedStart is { } start)
            request.PlannedStart = start;

        if (body.PlannedEnd is { } end)
            request.PlannedEnd = end;

        await featureTrackStagePatcher.PatchAsync(request, cancellationToken: ct);

        var dto = await featureGetter.GetAsync(
            new GetFeatureRequest { Id = featureId },
            cancellationToken: ct);

        return Ok(FeatureSummaryResponse.From(dto, PlanRequestHelpers.EmptyTasks));
    }
}
