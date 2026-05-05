using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Api.Controllers.Plan.Feature.Taxonomy;
using OneMoreTaskTracker.Proto.Features.PatchFeatureGateCommand;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Gates;

[ApiController]
[Authorize(Roles = Roles.Manager)]
[Route("api/plan/features/{featureId:int}/gates")]
public class PatchFeatureGateController(
    FeatureGatePatcher.FeatureGatePatcherClient gatePatcher,
    ILogger<PatchFeatureGateController> logger) : ControllerBase
{
    [HttpPatch("{gateKey}")]
    public async Task<ActionResult<PatchFeatureGateResponse>> Patch(
        int featureId,
        string gateKey,
        [FromBody] PatchFeatureGatePayload body,
        [FromHeader(Name = "If-Match")] string? ifMatch,
        CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var request = new PatchFeatureGateRequest
        {
            FeatureId = featureId,
            GateKey = gateKey,
            CallerUserId = User.GetUserId(),
        };

        if (body.Status is not null)
            request.Status = body.Status;
        if (body.RejectionReason is not null)
            request.RejectionReason = body.RejectionReason;

        var expectedVersion = body.ExpectedVersion ?? PlanRequestHelpers.ParseIfMatch(ifMatch, logger);
        if (expectedVersion.HasValue)
            request.ExpectedVersion = expectedVersion.Value;

        var response = await gatePatcher.PatchAsync(request, cancellationToken: ct);

        return Ok(new PatchFeatureGateResponse(
            response.FeatureId,
            response.FeatureVersion,
            FeatureTaxonomyProjector.FromProto(response.Taxonomy)));
    }
}
