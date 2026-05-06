using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Api.Controllers.Plan.Feature;
using OneMoreTaskTracker.Proto.Features.GetFeatureQuery;
using OneMoreTaskTracker.Proto.Features.PatchFeatureTrackCommand;
using OneMoreTaskTracker.Proto.Users;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Tracks;

[ApiController]
[Authorize(Roles = Roles.Manager)]
[Route("api/plan/features/{featureId:int}/tracks/{kind}")]
public class PatchFeatureTrackController(
    FeatureTrackPatcher.FeatureTrackPatcherClient featureTrackPatcher,
    FeatureGetter.FeatureGetterClient featureGetter,
    UserService.UserServiceClient userService,
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
        var (ownerHasValue, ownerProtoValue) = PlanRequestHelpers.DecodeOwnerField(body.TrackOwnerUserId);

        if (ownerHasValue && ownerProtoValue == 0)
            return BadRequest(new { error = PlanRequestHelpers.InvalidRequest });

        if (ownerHasValue && ownerProtoValue > 0)
        {
            var roster = await userService.LoadRosterForManagerAsync(callerUserId, logger, ct);
            if (!roster.ContainsKey(ownerProtoValue))
                return BadRequest(new { error = "Pick a teammate from the list" });
        }

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
