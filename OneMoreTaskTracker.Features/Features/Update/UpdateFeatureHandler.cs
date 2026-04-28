using Grpc.Core;
using Mapster;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Proto.Features.UpdateFeatureCommand;
using ProtoFeatureState = OneMoreTaskTracker.Proto.Features.FeatureState;
using ProtoFeatureStagePlan = OneMoreTaskTracker.Proto.Features.FeatureStagePlan;

namespace OneMoreTaskTracker.Features.Features.Update;

public class UpdateFeatureHandler(FeaturesDbContext db) : FeatureUpdater.FeatureUpdaterBase
{
    public override async Task<FeatureDto> Update(UpdateFeatureRequest request, ServerCallContext context)
    {
        // Include stage plans so StagePlanUpserter can mutate them in-place
        // inside the same tracked graph and SaveChanges emits one batched round-trip.
        var feature = await db.Features
                          .Include(f => f.StagePlans)
                          .FirstOrDefaultAsync(f => f.Id == request.Id, context.CancellationToken)
                      ?? throw new RpcException(new Status(StatusCode.NotFound, $"feature {request.Id} not found"));

        // The Features service independently verifies ownership; the gateway's
        // [Authorize] alone is insufficient (see microservices/security.md).
        if (request.CallerUserId <= 0 || feature.ManagerUserId != request.CallerUserId)
            throw new RpcException(new Status(StatusCode.PermissionDenied, "Not the feature owner"));

        if (!string.IsNullOrWhiteSpace(request.Title))
            feature.Title = request.Title.Trim();

        feature.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        feature.State = ProtoStateToEntity(request.State);
        feature.LeadUserId = request.LeadUserId > 0 ? request.LeadUserId : feature.LeadUserId;
        // manager_user_id is intentionally NOT mutated — ownership transfer is out of scope (spec 03 §170).

        var now = DateTime.UtcNow;
        if (request.StagePlans.Count > 0)
        {
            var inputs = ParseStagePlans(request.StagePlans);
            FeatureValidation.ValidateStagePlans(inputs);
            StagePlanUpserter.ApplyStagePlans(feature, inputs, now);
            StagePlanUpserter.RecomputeFeatureDates(feature);
        }
        else
        {
            // Back-compat: when no stage plans are sent, honour the legacy
            // planned_start / planned_end scalars on the request for existing
            // callers. api-contract.md v1 keeps these on the wire for back-compat
            // but they are no longer authoritative — once any stage plan is
            // populated via a PATCH with stage_plans, derivation takes over.
            feature.PlannedStart = FeatureValidation.ParseOptionalDate(request.PlannedStart, "planned_start");
            feature.PlannedEnd = FeatureValidation.ParseOptionalDate(request.PlannedEnd, "planned_end");
            FeatureValidation.ValidateDateOrder(feature.PlannedStart, feature.PlannedEnd);
        }

        feature.Touch(now);

        await db.SaveChangesAsync(context.CancellationToken);

        var dto = feature.Adapt<FeatureDto>();
        dto.StagePlans.Add(FeatureMappingConfig.BuildProtoStagePlans(feature));
        return dto;
    }

    // Translates proto StagePlan messages into neutral StagePlanInput records
    // so validation never touches generated transport types
    // (per microservices-contracts.md "generated transport types do not leak into domain").
    private static IReadOnlyList<StagePlanInput> ParseStagePlans(
        IEnumerable<ProtoFeatureStagePlan> raws)
    {
        var list = new List<StagePlanInput>();
        foreach (var raw in raws)
        {
            var start = FeatureValidation.ParseOptionalDate(raw.PlannedStart, "stage_plans.planned_start");
            var end = FeatureValidation.ParseOptionalDate(raw.PlannedEnd, "stage_plans.planned_end");
            list.Add(new StagePlanInput(raw.Stage, start, end, raw.PerformerUserId));
        }

        return list;
    }

    // feature_state.proto shares ordinals with the C# FeatureState enum (no UNSPECIFIED member),
    // so the cast is a simple (int). We still guard against out-of-range values that would arise
    // if the wire carries an unknown enum value.
    private static int ProtoStateToEntity(ProtoFeatureState s)
    {
        if (!Enum.IsDefined(typeof(ProtoFeatureState), s))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "state is required"));
        return (int)s;
    }
}