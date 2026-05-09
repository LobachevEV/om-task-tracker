using Grpc.Core;
using Mapster;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Proto.Features.PatchFeatureCommand;

namespace OneMoreTaskTracker.Features.Features.Update;

public sealed class PatchFeatureHandler(
    FeaturesDbContext db,
    ILogger<PatchFeatureHandler> logger,
    IRequestClock clock) : FeaturePatcher.FeaturePatcherBase
{
    private static readonly FeatureState[] CanonicalStages =
    [
        FeatureState.CsApproving,
        FeatureState.Development,
        FeatureState.Testing,
        FeatureState.EthalonTesting,
        FeatureState.LiveRelease,
    ];

    public override async Task<FeatureDto> Patch(PatchFeatureRequest request, ServerCallContext context)
    {
        var feature = await db.LoadFeatureWithTracksAsync(request.Id, context.CancellationToken);
        FeatureOwnershipGuard.EnsureManager(feature, request.CallerUserId);
        FeatureVersionGuard.EnsureFeatureVersion(feature, request.HasExpectedVersion, request.ExpectedVersion);

        if (request.HasCsApprovingPlannedStart || request.HasCsApprovingPlannedEnd
            || request.HasDevelopmentPlannedStart || request.HasDevelopmentPlannedEnd
            || request.HasTestingPlannedStart || request.HasTestingPlannedEnd
            || request.HasEthalonTestingPlannedStart || request.HasEthalonTestingPlannedEnd
            || request.HasLiveReleasePlannedStart || request.HasLiveReleasePlannedEnd)
        {
            EnsureStageOrder(feature, request);
        }

        var now = clock.GetUtcNow();
        var anyMutation = false;
        var anyDateMutation = false;

        if (request.HasTitle)
        {
            feature.RenameTitle((request.Title ?? string.Empty).Trim(), now);
            anyMutation = true;
        }

        if (request.HasDescription)
        {
            var trimmed = (request.Description ?? string.Empty).TrimEnd();
            feature.SetDescription(string.IsNullOrWhiteSpace(trimmed) ? null : trimmed, now);
            anyMutation = true;
        }

        if (request.HasLeadUserId)
        {
            feature.AssignLead(request.LeadUserId, now);
            anyMutation = true;
        }

        if (request.HasCsApprovingPlannedStart)
        {
            feature.SetStagePlannedStart(FeatureState.CsApproving, PlannedDate.Parse(request.CsApprovingPlannedStart), now);
            anyMutation = true;
            anyDateMutation = true;
        }

        if (request.HasCsApprovingPlannedEnd)
        {
            feature.SetStagePlannedEnd(FeatureState.CsApproving, PlannedDate.Parse(request.CsApprovingPlannedEnd), now);
            anyMutation = true;
            anyDateMutation = true;
        }

        if (request.HasCsApprovingOwnerUserId)
        {
            feature.AssignStageOwner(FeatureState.CsApproving, request.CsApprovingOwnerUserId > 0 ? request.CsApprovingOwnerUserId : null, now);
            anyMutation = true;
        }

        if (request.HasDevelopmentPlannedStart)
        {
            feature.SetStagePlannedStart(FeatureState.Development, PlannedDate.Parse(request.DevelopmentPlannedStart), now);
            anyMutation = true;
            anyDateMutation = true;
        }

        if (request.HasDevelopmentPlannedEnd)
        {
            feature.SetStagePlannedEnd(FeatureState.Development, PlannedDate.Parse(request.DevelopmentPlannedEnd), now);
            anyMutation = true;
            anyDateMutation = true;
        }

        if (request.HasDevelopmentOwnerUserId)
        {
            feature.AssignStageOwner(FeatureState.Development, request.DevelopmentOwnerUserId > 0 ? request.DevelopmentOwnerUserId : null, now);
            anyMutation = true;
        }

        if (request.HasTestingPlannedStart)
        {
            feature.SetStagePlannedStart(FeatureState.Testing, PlannedDate.Parse(request.TestingPlannedStart), now);
            anyMutation = true;
            anyDateMutation = true;
        }

        if (request.HasTestingPlannedEnd)
        {
            feature.SetStagePlannedEnd(FeatureState.Testing, PlannedDate.Parse(request.TestingPlannedEnd), now);
            anyMutation = true;
            anyDateMutation = true;
        }

        if (request.HasTestingOwnerUserId)
        {
            feature.AssignStageOwner(FeatureState.Testing, request.TestingOwnerUserId > 0 ? request.TestingOwnerUserId : null, now);
            anyMutation = true;
        }

        if (request.HasEthalonTestingPlannedStart)
        {
            feature.SetStagePlannedStart(FeatureState.EthalonTesting, PlannedDate.Parse(request.EthalonTestingPlannedStart), now);
            anyMutation = true;
            anyDateMutation = true;
        }

        if (request.HasEthalonTestingPlannedEnd)
        {
            feature.SetStagePlannedEnd(FeatureState.EthalonTesting, PlannedDate.Parse(request.EthalonTestingPlannedEnd), now);
            anyMutation = true;
            anyDateMutation = true;
        }

        if (request.HasEthalonTestingOwnerUserId)
        {
            feature.AssignStageOwner(FeatureState.EthalonTesting, request.EthalonTestingOwnerUserId > 0 ? request.EthalonTestingOwnerUserId : null, now);
            anyMutation = true;
        }

        if (request.HasLiveReleasePlannedStart)
        {
            feature.SetStagePlannedStart(FeatureState.LiveRelease, PlannedDate.Parse(request.LiveReleasePlannedStart), now);
            anyMutation = true;
            anyDateMutation = true;
        }

        if (request.HasLiveReleasePlannedEnd)
        {
            feature.SetStagePlannedEnd(FeatureState.LiveRelease, PlannedDate.Parse(request.LiveReleasePlannedEnd), now);
            anyMutation = true;
            anyDateMutation = true;
        }

        if (request.HasLiveReleaseOwnerUserId)
        {
            feature.AssignStageOwner(FeatureState.LiveRelease, request.LiveReleaseOwnerUserId > 0 ? request.LiveReleaseOwnerUserId : null, now);
            anyMutation = true;
        }

        if (anyMutation)
        {
            if (anyDateMutation)
                feature.RecomputePlannedDates();

            await db.SaveFeatureAsync(feature, context.CancellationToken);

            logger.LogInformation(
                "Feature patch applied: feature_id={FeatureId} fields_title={HasTitle} fields_description={HasDescription} fields_lead={HasLead} actor_user_id={ActorUserId} version={Version}",
                feature.Id,
                request.HasTitle,
                request.HasDescription,
                request.HasLeadUserId,
                request.CallerUserId,
                feature.Version);
        }

        var dto = feature.Adapt<FeatureDto>();
        dto.Tracks.AddRange(FeatureMappingConfig.BuildProtoTracks(feature));
        return dto;
    }

    private static void EnsureStageOrder(Feature feature, PatchFeatureRequest request)
    {
        var snapshots = CanonicalStages
            .Select(stage =>
            {
                var prospectiveStart = stage switch
                {
                    FeatureState.CsApproving    when request.HasCsApprovingPlannedStart    => PlannedDate.Parse(request.CsApprovingPlannedStart),
                    FeatureState.Development    when request.HasDevelopmentPlannedStart    => PlannedDate.Parse(request.DevelopmentPlannedStart),
                    FeatureState.Testing        when request.HasTestingPlannedStart        => PlannedDate.Parse(request.TestingPlannedStart),
                    FeatureState.EthalonTesting when request.HasEthalonTestingPlannedStart => PlannedDate.Parse(request.EthalonTestingPlannedStart),
                    FeatureState.LiveRelease    when request.HasLiveReleasePlannedStart    => PlannedDate.Parse(request.LiveReleasePlannedStart),
                    _                                                                      => feature.GetStagePlannedStart(stage),
                };
                var prospectiveEnd = stage switch
                {
                    FeatureState.CsApproving    when request.HasCsApprovingPlannedEnd    => PlannedDate.Parse(request.CsApprovingPlannedEnd),
                    FeatureState.Development    when request.HasDevelopmentPlannedEnd    => PlannedDate.Parse(request.DevelopmentPlannedEnd),
                    FeatureState.Testing        when request.HasTestingPlannedEnd        => PlannedDate.Parse(request.TestingPlannedEnd),
                    FeatureState.EthalonTesting when request.HasEthalonTestingPlannedEnd => PlannedDate.Parse(request.EthalonTestingPlannedEnd),
                    FeatureState.LiveRelease    when request.HasLiveReleasePlannedEnd    => PlannedDate.Parse(request.LiveReleasePlannedEnd),
                    _                                                                    => feature.GetStagePlannedEnd(stage),
                };
                return new StageDateSnapshot((int)stage, prospectiveStart, prospectiveEnd);
            })
            .ToList();

        var ordered = snapshots.OrderBy(s => s.Ordinal).ToArray();
        for (int i = 0; i < ordered.Length - 1; i++)
        {
            var earlier = ordered[i];
            var later   = ordered[i + 1];

            if (earlier.PlannedEnd is not { } earlierEnd) continue;
            if (later.PlannedStart is not { } laterStart) continue;

            if (laterStart < earlierEnd)
            {
                var neighbourName = StageName(later.Ordinal);
                throw new RpcException(new Status(
                    StatusCode.FailedPrecondition,
                    ConflictDetail.StageOrderOverlap(neighbourName)));
            }
        }
    }

    private static string StageName(int ordinal) =>
        ordinal >= 0 && ordinal < CanonicalStages.Length
            ? CanonicalStages[ordinal].ToString()
            : ordinal.ToString();

    private readonly record struct StageDateSnapshot(
        int Ordinal,
        DateOnly? PlannedStart,
        DateOnly? PlannedEnd);
}
