using Grpc.Core;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Proto.Features.AppendFeatureSubStageCommand;

namespace OneMoreTaskTracker.Features.Features.Update;

public sealed class AppendFeatureSubStageHandler(
    FeaturesDbContext db,
    ILogger<AppendFeatureSubStageHandler> logger,
    IRequestClock clock) : FeatureSubStageAppender.FeatureSubStageAppenderBase
{
    public override async Task<AppendFeatureSubStageResponse> Append(AppendFeatureSubStageRequest request, ServerCallContext context)
    {
        var feature = await db.LoadFeatureWithTaxonomyAsync(request.FeatureId, context.CancellationToken);
        FeatureOwnershipGuard.EnsureManager(feature, request.CallerUserId);

        var track = ParseTrack(request.Track);
        var phase = ParsePhase(request.Phase);

        if (!FeatureStageLayout.IsMultiOwner(phase))
            throw new RpcException(new Status(StatusCode.FailedPrecondition,
                $"phase {phase} does not support multiple sub-stages"));

        if (FeatureStageLayout.CountSubStages(feature, track, phase) >= FeatureStageLayout.SubStageHardCap)
            throw new RpcException(new Status(StatusCode.FailedPrecondition,
                ConflictDetail.SubStageCapReached(track.ToString(), phase.ToString(), FeatureStageLayout.SubStageHardCap)));

        var now = clock.GetUtcNow();
        var ownerUserId = request.HasOwnerUserId ? request.OwnerUserId : 0;
        var plannedStart = ParseOptionalDate(request.HasPlannedStart ? request.PlannedStart : null);
        var plannedEnd   = ParseOptionalDate(request.HasPlannedEnd   ? request.PlannedEnd   : null);

        var sub = FeatureStageLayout.Append(feature, track, phase, ownerUserId, plannedStart, plannedEnd, now);
        feature.RecordSubStageMutation(now);

        await db.SaveFeatureAsync(feature, context.CancellationToken);

        logger.LogInformation(
            "Feature sub-stage appended: feature_id={FeatureId} sub_stage_id={SubStageId} track={Track} phase={Phase} ordinal={Ordinal} owner_user_id={OwnerUserId} actor_user_id={ActorUserId} feature_version={FeatureVersion}",
            feature.Id,
            sub.Id,
            sub.Track,
            sub.PhaseKind,
            sub.Ordinal,
            sub.OwnerUserId,
            request.CallerUserId,
            feature.Version);

        return new AppendFeatureSubStageResponse
        {
            FeatureId         = feature.Id,
            FeatureVersion    = feature.Version,
            CreatedSubStageId = sub.Id,
            Taxonomy          = FeatureMappingConfig.BuildProtoTaxonomy(feature),
        };
    }

    private static DateOnly? ParseOptionalDate(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return null;
        return DateOnly.ParseExact(raw, "yyyy-MM-dd");
    }

    private static Track ParseTrack(string raw) => (raw ?? string.Empty).ToLowerInvariant() switch
    {
        "backend"  => Track.Backend,
        "frontend" => Track.Frontend,
        _          => throw new RpcException(new Status(StatusCode.InvalidArgument, "track must be backend|frontend")),
    };

    private static PhaseKind ParsePhase(string raw) => (raw ?? string.Empty).ToLowerInvariant() switch
    {
        "development"     => PhaseKind.Development,
        "stand-testing"   => PhaseKind.StandTesting,
        "standtesting"    => PhaseKind.StandTesting,
        "ethalon-testing" => PhaseKind.EthalonTesting,
        "ethalontesting"  => PhaseKind.EthalonTesting,
        "live-release"    => PhaseKind.LiveRelease,
        "liverelease"     => PhaseKind.LiveRelease,
        _                 => throw new RpcException(new Status(StatusCode.InvalidArgument, "phase invalid")),
    };
}
