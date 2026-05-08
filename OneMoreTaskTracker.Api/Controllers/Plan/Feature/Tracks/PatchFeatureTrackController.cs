using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Api.Controllers.Plan.Feature;
using OneMoreTaskTracker.Api.Roster;
using OneMoreTaskTracker.Proto.Features.GetFeatureQuery;
using OneMoreTaskTracker.Proto.Features.PatchFeatureTrackCommand;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Tracks;

[ApiController]
[Authorize(Roles = Roles.Manager)]
[Route("api/plan/features/{featureId:int}/tracks/{kind}")]
public class PatchFeatureTrackController(
    FeatureTrackPatcher.FeatureTrackPatcherClient featureTrackPatcher,
    FeatureGetter.FeatureGetterClient featureGetter,
    IValidator<PatchFeatureTrackPayload> validator,
    ILogger<PatchFeatureTrackController> logger) : ControllerBase
{
    [HttpPatch("")]
    public async Task<ActionResult<FeatureSummaryResponse>> Patch(
        int featureId,
        string kind,
        [FromBody] PatchFeatureTrackPayload body,
        [FromHeader(Name = "If-Match")] string? ifMatch,
        CancellationToken ct)
    {
        if (!TrackKindParser.TryParse(kind, out var parsedKind))
            return BadRequest(new { error = PlanRequestHelpers.InvalidRequest });

        var callerUserId = User.GetUserId();
        var validationContext = new ValidationContext<PatchFeatureTrackPayload>(body);
        validationContext.SetCallerUserId(callerUserId);
        var validation = await validator.ValidateAsync(validationContext, ct);
        if (!validation.IsValid)
            return BadRequest(new { error = validation.Errors[0].ErrorMessage });

        var (ownerHasValue, ownerProtoValue) = PlanRequestHelpers.DecodeOwnerField(body.TrackOwnerUserId);
        var headerVersion = PlanRequestHelpers.ParseIfMatch(ifMatch, logger);
        var expectedVersion = body.ExpectedVersion ?? headerVersion;

        var request = new PatchFeatureTrackRequest
        {
            FeatureId    = featureId,
            Kind         = parsedKind,
            CallerUserId = callerUserId,
        };

        if (ownerHasValue)
            request.TrackOwnerUserId = ownerProtoValue;

        if (expectedVersion.HasValue)
            request.ExpectedVersion = expectedVersion.Value;

        await featureTrackPatcher.PatchAsync(request, cancellationToken: ct);

        var dto = await featureGetter.GetAsync(
            new GetFeatureRequest { Id = featureId },
            cancellationToken: ct);

        return Ok(FeatureSummaryResponse.From(dto, PlanRequestHelpers.EmptyTasks));
    }
}
