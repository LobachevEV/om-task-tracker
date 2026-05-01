namespace OneMoreTaskTracker.Features.Features.Data;

public static class FeatureStageLayout
{
    public const int SubStageHardCap = 6;

    public const string SpecGateKey = "spec";
    public const string BackendPrepGateKey = "backend.prep-gate";
    public const string FrontendPrepGateKey = "frontend.prep-gate";

    public static readonly Track[] AllTracks = [Track.Backend, Track.Frontend];

    public static readonly PhaseKind[] AllPhases =
    [
        PhaseKind.Development,
        PhaseKind.StandTesting,
        PhaseKind.EthalonTesting,
        PhaseKind.LiveRelease,
    ];

    public static bool IsMultiOwner(PhaseKind phase) =>
        phase == PhaseKind.Development || phase == PhaseKind.StandTesting;

    public static void Materialize(Feature feature, DateTime now)
    {
        feature.Gates.Add(new FeatureGate
        {
            GateKey = SpecGateKey,
            Kind = GateKind.Spec,
            Track = null,
            CreatedAt = now,
        });
        feature.Gates.Add(new FeatureGate
        {
            GateKey = BackendPrepGateKey,
            Kind = GateKind.Cs,
            Track = Track.Backend,
            CreatedAt = now,
        });
        feature.Gates.Add(new FeatureGate
        {
            GateKey = FrontendPrepGateKey,
            Kind = GateKind.Sr,
            Track = Track.Frontend,
            CreatedAt = now,
        });

        foreach (var gate in feature.Gates)
        {
            gate.MarkRequested(now);
        }

        foreach (var track in AllTracks)
        {
            foreach (var phase in AllPhases)
            {
                var sub = new FeatureSubStage
                {
                    Track = track,
                    PhaseKind = phase,
                    CreatedAt = now,
                };
                sub.SeedOrdinal(1);
                sub.Touch(now);
                feature.SubStages.Add(sub);
            }
        }
    }

    public static FeatureSubStage Append(
        Feature feature,
        Track track,
        PhaseKind phase,
        int ownerUserId,
        DateOnly? plannedStart,
        DateOnly? plannedEnd,
        DateTime now)
    {
        var siblings = feature.SubStages
            .Where(s => s.Track == track && s.PhaseKind == phase)
            .OrderBy(s => s.Ordinal)
            .ToList();

        var nextOrdinal = (short)(siblings.Count + 1);
        var previous = siblings.LastOrDefault();

        var resolvedStart = plannedStart ?? previous?.PlannedEnd;
        var resolvedEnd = plannedEnd ?? (resolvedStart?.AddDays(1));

        var sub = new FeatureSubStage
        {
            Track = track,
            PhaseKind = phase,
            CreatedAt = now,
        };
        sub.SeedOrdinal(nextOrdinal);
        sub.SeedOwner(ownerUserId > 0 ? ownerUserId : 0);
        sub.SeedDates(resolvedStart, resolvedEnd);
        sub.Touch(now);

        feature.SubStages.Add(sub);
        return sub;
    }

    public static void RecomputeOrdinals(Feature feature, Track track, PhaseKind phase, DateTime now)
    {
        var siblings = feature.SubStages
            .Where(s => s.Track == track && s.PhaseKind == phase)
            .OrderBy(s => s.Ordinal)
            .ToList();

        for (var i = 0; i < siblings.Count; i++)
        {
            var expected = (short)(i + 1);
            if (siblings[i].Ordinal != expected)
                siblings[i].Reposition(expected, now);
        }
    }

    public static int CountSubStages(Feature feature, Track track, PhaseKind phase) =>
        feature.SubStages.Count(s => s.Track == track && s.PhaseKind == phase);
}
