using Grpc.Core;
using Mapster;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Proto.Features.CreateFeatureCommand;

namespace OneMoreTaskTracker.Features.Features.Create;

public class CreateFeatureHandler(FeaturesDbContext db) : FeatureCreator.FeatureCreatorBase
{
    // Canonical FeatureState ordinals. Materialized as 5 empty rows on every
    // create so subsequent reads always return exactly 5 stage plans — the FE
    // never has to back-fill client-side.
    private static readonly int[] CanonicalStageOrdinals =
    [
        (int)FeatureState.CsApproving,
        (int)FeatureState.Development,
        (int)FeatureState.Testing,
        (int)FeatureState.EthalonTesting,
        (int)FeatureState.LiveRelease,
    ];

    public override async Task<FeatureDto> Create(CreateFeatureRequest request, ServerCallContext context)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "title is required"));
        if (request.ManagerUserId <= 0)
            throw new RpcException(new Status(StatusCode.InvalidArgument, "manager_user_id is required"));

        var plannedStart = FeatureValidation.ParseOptionalDate(request.PlannedStart, "planned_start");
        var plannedEnd   = FeatureValidation.ParseOptionalDate(request.PlannedEnd,   "planned_end");
        FeatureValidation.ValidateDateOrder(plannedStart, plannedEnd);

        var now = DateTime.UtcNow;

        var feature = new Feature
        {
            Title         = request.Title.Trim(),
            Description   = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            State         = (int)FeatureState.CsApproving,
            PlannedStart  = plannedStart,
            PlannedEnd    = plannedEnd,
            LeadUserId    = request.LeadUserId > 0 ? request.LeadUserId : request.ManagerUserId,
            ManagerUserId = request.ManagerUserId,
            CreatedAt     = now,
            UpdatedAt     = now,
        };

        // Materialize 5 empty stage plans as part of the same SaveChanges call
        // so the feature + its stage rows land atomically (EF Core batches the
        // INSERTs into a single round trip). PerformerUserId defaults to 0
        // (unassigned) matching the proto3 scalar default on the wire.
        foreach (var stage in CanonicalStageOrdinals)
        {
            feature.StagePlans.Add(new FeatureStagePlan
            {
                Stage           = stage,
                PlannedStart    = null,
                PlannedEnd      = null,
                PerformerUserId = 0,
                CreatedAt       = now,
                UpdatedAt       = now,
            });
        }

        db.Features.Add(feature);
        await db.SaveChangesAsync(context.CancellationToken);

        var dto = feature.Adapt<FeatureDto>();
        dto.StagePlans.Add(FeatureMappingConfig.BuildProtoStagePlans(feature));
        return dto;
    }
}
