using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Api.Controllers.Plan.Feature;
using OneMoreTaskTracker.Api.Roster;
using OneMoreTaskTracker.Proto.Features.PatchFeatureStageCommand;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Stages;

[ApiController]
[Authorize(Roles = Roles.Manager)]
[Route("api/plan/features/{id:int}/stages/{stage}")]
public class PatchFeatureStageController(
    FeatureStagePatcher.FeatureStagePatcherClient featureStagePatcher,
    IValidator<PatchFeatureStagePayload> validator,
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

        var callerUserId = User.GetUserId();
        var validationContext = new ValidationContext<PatchFeatureStagePayload>(body);
        validationContext.SetCallerUserId(callerUserId);
        var validation = await validator.ValidateAsync(validationContext, ct);
        if (!validation.IsValid)
            return BadRequest(new { error = validation.Errors[0].ErrorMessage });

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
        return Ok(FeatureSummaryResponse.From(dto, PlanRequestHelpers.EmptyTasks));
    }
}
