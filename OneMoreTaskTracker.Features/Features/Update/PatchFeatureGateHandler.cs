using Grpc.Core;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Proto.Features.PatchFeatureGateCommand;

namespace OneMoreTaskTracker.Features.Features.Update;

public sealed class PatchFeatureGateHandler(
    FeaturesDbContext db,
    ILogger<PatchFeatureGateHandler> logger,
    TimeProvider timeProvider) : FeatureGatePatcher.FeatureGatePatcherBase
{
    public override async Task<FeatureTaxonomyResponse> Patch(PatchFeatureGateRequest request, ServerCallContext context)
    {
        var feature = await db.LoadFeatureWithTaxonomyAsync(request.FeatureId, context.CancellationToken);
        FeatureOwnershipGuard.EnsureManager(feature, request.CallerUserId);

        var gate = feature.ResolveGate(request.GateKey)
                   ?? throw new RpcException(new Status(StatusCode.NotFound, $"gate {request.GateKey} not found"));

        FeatureVersionGuard.EnsureGateVersion(gate, request.HasExpectedVersion, request.ExpectedVersion);

        var mutated = false;

        if (request.HasStatus)
        {
            gate.ApplyStatusPatch(request.Status, request.RejectionReason, request.CallerUserId, timeProvider.GetUtcNow().UtcDateTime);
            mutated = true;
        }

        if (mutated)
        {
            await db.SaveGateAsync(gate, context.CancellationToken);

            logger.LogInformation(
                "Feature gate patched: feature_id={FeatureId} gate_key={GateKey} status={Status} approver_user_id={ApproverUserId} actor_user_id={ActorUserId} gate_version={GateVersion} feature_version={FeatureVersion}",
                feature.Id,
                gate.GateKey,
                gate.Status,
                gate.ApproverUserId,
                request.CallerUserId,
                gate.Version,
                feature.Version);
        }

        return new FeatureTaxonomyResponse
        {
            FeatureId      = feature.Id,
            FeatureVersion = feature.Version,
            Taxonomy       = FeatureMappingConfig.BuildProtoTaxonomy(feature),
        };
    }
}
