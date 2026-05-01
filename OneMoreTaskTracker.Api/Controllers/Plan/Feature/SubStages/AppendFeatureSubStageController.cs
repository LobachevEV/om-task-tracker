using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Api.Controllers.Plan.Feature.Taxonomy;
using OneMoreTaskTracker.Proto.Features.AppendFeatureSubStageCommand;
using OneMoreTaskTracker.Proto.Users;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.SubStages;

[ApiController]
[Authorize(Roles = Roles.Manager)]
[Route("api/plan/features/{featureId:int}/phases/{track}/{phase}/sub-stages")]
public class AppendFeatureSubStageController(
    FeatureSubStageAppender.FeatureSubStageAppenderClient subStageAppender,
    UserService.UserServiceClient userService,
    ILogger<AppendFeatureSubStageController> logger) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<SubStageMutationResponse>> Append(
        int featureId,
        string track,
        string phase,
        [FromBody] AppendFeatureSubStagePayload body,
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

        var request = new AppendFeatureSubStageRequest
        {
            FeatureId = featureId,
            CallerUserId = callerUserId,
            Track = track,
            Phase = phase,
        };

        if (body.OwnerUserId is { } ownerUserId)
            request.OwnerUserId = ownerUserId;
        if (body.PlannedStart is not null)
            request.PlannedStart = body.PlannedStart;
        if (body.PlannedEnd is not null)
            request.PlannedEnd = body.PlannedEnd;

        var response = await subStageAppender.AppendAsync(request, cancellationToken: ct);

        return Ok(new SubStageMutationResponse(
            response.FeatureId,
            response.FeatureVersion,
            response.CreatedSubStageId,
            FeatureTaxonomyProjector.FromProto(response.Taxonomy)));
    }
}
