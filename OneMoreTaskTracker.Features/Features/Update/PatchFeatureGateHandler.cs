using Grpc.Core;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Proto.Features.PatchFeatureGateCommand;

namespace OneMoreTaskTracker.Features.Features.Update;

public sealed class PatchFeatureGateHandler(
    FeaturesDbContext db,
    ILogger<PatchFeatureGateHandler> logger,
    IRequestClock clock) : FeatureGatePatcher.FeatureGatePatcherBase
{
    private const string StatusApproved = "approved";
    private const string StatusRejected = "rejected";
    private const string StatusWaiting  = "waiting";

    public override async Task<FeatureTaxonomyResponse> Patch(PatchFeatureGateRequest request, ServerCallContext context)
    {
        var feature = await db.LoadFeatureWithTaxonomyAsync(request.FeatureId, context.CancellationToken);
        FeatureOwnershipGuard.EnsureManager(feature, request.CallerUserId);

        var gate = feature.ResolveGate(request.GateKey)
                   ?? throw new RpcException(new Status(StatusCode.NotFound, $"gate {request.GateKey} not found"));

        FeatureVersionGuard.EnsureGateVersion(gate, request.HasExpectedVersion, request.ExpectedVersion);

        var now = clock.GetUtcNow();
        var mutated = false;

        if (request.HasStatus)
        {
            var status = (request.Status ?? string.Empty).ToLowerInvariant();
            switch (status)
            {
                case StatusApproved:
                    gate.Approve(request.CallerUserId, now);
                    mutated = true;
                    break;
                case StatusRejected:
                    var reason = (request.RejectionReason ?? string.Empty).Trim();
                    gate.Reject(reason, request.CallerUserId, now);
                    mutated = true;
                    break;
                case StatusWaiting:
                    gate.ResetToWaiting(now);
                    mutated = true;
                    break;
                default:
                    throw new RpcException(new Status(StatusCode.InvalidArgument, "status must be approved|rejected|waiting"));
            }
        }

        if (mutated)
        {
            feature.RecordGateFlip(now);
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
