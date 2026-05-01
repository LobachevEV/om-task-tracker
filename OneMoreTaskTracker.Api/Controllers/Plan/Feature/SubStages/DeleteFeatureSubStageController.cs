using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Api.Controllers.Plan.Feature.Taxonomy;
using OneMoreTaskTracker.Proto.Features.DeleteFeatureSubStageCommand;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.SubStages;

[ApiController]
[Authorize(Roles = Roles.Manager)]
[Route("api/plan/features/{featureId:int}/sub-stages")]
public class DeleteFeatureSubStageController(
    FeatureSubStageDeleter.FeatureSubStageDeleterClient subStageDeleter,
    ILogger<DeleteFeatureSubStageController> logger) : ControllerBase
{
    [HttpDelete("{subStageId:int}")]
    public async Task<ActionResult<SubStageMutationResponse>> Delete(
        int featureId,
        int subStageId,
        [FromHeader(Name = "If-Match")] string? ifMatch,
        CancellationToken ct)
    {
        var callerUserId = User.GetUserId();
        var headerVersion = PlanRequestHelpers.ParseIfMatch(ifMatch, logger);

        var request = new DeleteFeatureSubStageRequest
        {
            FeatureId = featureId,
            SubStageId = subStageId,
            CallerUserId = callerUserId,
        };

        if (headerVersion.HasValue)
            request.ExpectedVersion = headerVersion.Value;

        var response = await subStageDeleter.DeleteAsync(request, cancellationToken: ct);

        return Ok(new SubStageMutationResponse(
            response.FeatureId,
            response.FeatureVersion,
            null,
            FeatureTaxonomyProjector.FromProto(response.Taxonomy)));
    }
}
