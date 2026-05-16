using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Api.Controllers.Plan.Feature;
using OneMoreTaskTracker.Api.Roster;
using OneMoreTaskTracker.Proto.Features.PatchFeatureTrackStageCommand;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Tracks;

[ApiController]
[Authorize(Roles = Roles.Manager)]
[Route("api/plan/features/{featureId:int}/tracks/{kind}/stages/{stageKey}")]
public class PatchFeatureTrackStageController(
    FeatureTrackStagePatcher.FeatureTrackStagePatcherClient featureTrackStagePatcher,
    IValidator<PatchFeatureTrackStagePayload> validator,
    ILogger<PatchFeatureTrackStageController> logger) : ControllerBase
{
    [HttpPatch("")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Patch(
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

        var callerUserId = User.GetUserId();
        var validationContext = new ValidationContext<PatchFeatureTrackStagePayload>(body);
        validationContext.SetCallerUserId(callerUserId);
        var validation = await validator.ValidateAsync(validationContext, ct);
        if (!validation.IsValid)
            return BadRequest(new { error = validation.Errors[0].ErrorMessage });

        var (ownerHasValue, ownerProtoValue) = PlanRequestHelpers.DecodeOwnerField(body.StageOwnerUserId);
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
        return NoContent();
    }
}
