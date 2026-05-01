using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Api.Controllers.Plan.Feature.Taxonomy;
using OneMoreTaskTracker.Proto.Features.PatchFeatureSubStageCommand;
using OneMoreTaskTracker.Proto.Users;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.SubStages;

[ApiController]
[Authorize(Roles = Roles.Manager)]
[Route("api/plan/features/{featureId:int}/sub-stages")]
public class PatchFeatureSubStageController(
    FeatureSubStagePatcher.FeatureSubStagePatcherClient subStagePatcher,
    UserService.UserServiceClient userService,
    ILogger<PatchFeatureSubStageController> logger) : ControllerBase
{
    [HttpPatch("{subStageId:int}")]
    public async Task<ActionResult<SubStageMutationResponse>> Patch(
        int featureId,
        int subStageId,
        [FromBody] PatchFeatureSubStagePayload body,
        [FromHeader(Name = "If-Match")] string? ifMatch,
        CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var callerUserId = User.GetUserId();

        if (body.OwnerUserId is { } ownerId)
        {
            if (ownerId < 1)
                return BadRequest(new { error = PlanRequestHelpers.InvalidRequest });
            var roster = await userService.LoadRosterForManagerAsync(callerUserId, logger, ct);
            if (!roster.ContainsKey(ownerId))
                return BadRequest(new { error = "Pick a teammate from the list" });
        }

        var headerVersion = PlanRequestHelpers.ParseIfMatch(ifMatch, logger);
        var expectedVersion = body.ExpectedVersion ?? headerVersion;

        var request = new PatchFeatureSubStageRequest
        {
            FeatureId = featureId,
            SubStageId = subStageId,
            CallerUserId = callerUserId,
        };

        if (body.OwnerUserId is { } ownerUserId)
            request.OwnerUserId = ownerUserId;
        if (body.PlannedStart is not null)
            request.PlannedStart = body.PlannedStart;
        if (body.PlannedEnd is not null)
            request.PlannedEnd = body.PlannedEnd;
        if (expectedVersion.HasValue)
            request.ExpectedVersion = expectedVersion.Value;

        var response = await subStagePatcher.PatchAsync(request, cancellationToken: ct);

        return Ok(new SubStageMutationResponse(
            response.FeatureId,
            response.FeatureVersion,
            null,
            FeatureTaxonomyProjector.FromProto(response.Taxonomy)));
    }
}
