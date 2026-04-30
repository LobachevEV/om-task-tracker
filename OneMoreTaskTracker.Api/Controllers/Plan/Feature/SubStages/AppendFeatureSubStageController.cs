using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Api.Controllers.Plan.Feature.Taxonomy;
using OneMoreTaskTracker.Proto.Features.AppendFeatureSubStageCommand;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.SubStages;

[ApiController]
[Authorize(Roles = Roles.Manager)]
[Route("api/plan/features/{featureId:int}/phases/{track}/{phase}/sub-stages")]
public class AppendFeatureSubStageController(
    FeatureSubStageAppender.FeatureSubStageAppenderClient subStageAppender) : ControllerBase
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
