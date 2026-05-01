using OneMoreTaskTracker.Proto.Features;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Taxonomy;

internal static class FeatureTaxonomyProjector
{
    private const int SubStageHardCap = 6;

    private static readonly (FeatureTrack Wire, string Public)[] AllTracks =
    {
        (FeatureTrack.TrackBackend,  "backend"),
        (FeatureTrack.TrackFrontend, "frontend"),
    };

    private static readonly (FeaturePhaseKind Wire, string Public, bool MultiOwner)[] AllPhases =
    {
        (FeaturePhaseKind.PhaseKindDevelopment,    "development",     true),
        (FeaturePhaseKind.PhaseKindStandTesting,   "stand-testing",   true),
        (FeaturePhaseKind.PhaseKindEthalonTesting, "ethalon-testing", false),
        (FeaturePhaseKind.PhaseKindLiveRelease,    "live-release",    false),
    };

    public static FeatureTaxonomyResponse FromProto(FeatureTaxonomyDto? taxonomy)
    {
        var safe = taxonomy ?? new FeatureTaxonomyDto();
        var gates = safe.Gates.Select(MapGate).ToList();
        var tracks = AllTracks
            .Select(t => BuildTrack(t.Wire, t.Public, safe.SubStages))
            .ToList();
        return new FeatureTaxonomyResponse(gates, tracks);
    }

    private static FeatureTrackResponse BuildTrack(
        FeatureTrack track,
        string trackName,
        IEnumerable<FeatureSubStageDto> allSubStages)
    {
        var phases = AllPhases.Select(p =>
        {
            var subStages = allSubStages
                .Where(s => s.Track == track && s.PhaseKind == p.Wire)
                .OrderBy(s => s.Ordinal)
                .Select(s => MapSubStage(s, trackName, p.Public))
                .ToList();
            var cap = p.MultiOwner ? SubStageHardCap : 1;
            return new FeaturePhaseResponse(p.Public, p.MultiOwner, cap, subStages);
        }).ToList();

        return new FeatureTrackResponse(trackName, phases);
    }

    private static FeatureGateResponse MapGate(FeatureGateDto g)
    {
        return new FeatureGateResponse(
            g.Id,
            g.GateKey,
            MapKind(g.Kind),
            g.HasTrack ? MapTrack(g.Track) : null,
            MapStatus(g.Status),
            g.ApproverUserId > 0 ? g.ApproverUserId : null,
            string.IsNullOrEmpty(g.ApprovedAtUtc) ? null : g.ApprovedAtUtc,
            string.IsNullOrEmpty(g.RequestedAtUtc) ? null : g.RequestedAtUtc,
            string.IsNullOrEmpty(g.RejectionReason) ? null : g.RejectionReason,
            g.Version);
    }

    private static FeatureSubStageResponse MapSubStage(FeatureSubStageDto s, string trackName, string phaseName)
    {
        return new FeatureSubStageResponse(
            s.Id,
            trackName,
            phaseName,
            s.Ordinal,
            s.OwnerUserId > 0 ? s.OwnerUserId : null,
            string.IsNullOrEmpty(s.PlannedStart) ? null : s.PlannedStart,
            string.IsNullOrEmpty(s.PlannedEnd) ? null : s.PlannedEnd,
            s.Version);
    }

    private static string MapTrack(FeatureTrack track) => track switch
    {
        FeatureTrack.TrackBackend  => "backend",
        FeatureTrack.TrackFrontend => "frontend",
        _                          => "unknown",
    };

    private static string MapKind(FeatureGateKind kind) => kind switch
    {
        FeatureGateKind.GateKindSpec => "spec",
        FeatureGateKind.GateKindCs   => "cs",
        FeatureGateKind.GateKindSr   => "sr",
        _                            => "unknown",
    };

    private static string MapStatus(FeatureGateStatus status) => status switch
    {
        FeatureGateStatus.GateStatusWaiting  => "waiting",
        FeatureGateStatus.GateStatusApproved => "approved",
        FeatureGateStatus.GateStatusRejected => "rejected",
        _                                    => "unknown",
    };
}
