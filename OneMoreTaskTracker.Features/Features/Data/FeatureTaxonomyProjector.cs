namespace OneMoreTaskTracker.Features.Features.Data;

public static class FeatureTaxonomyProjector
{
    private static readonly IReadOnlyDictionary<string, int> GateOrder = new Dictionary<string, int>
    {
        [FeatureStageLayout.SpecGateKey]         = 0,
        [FeatureStageLayout.BackendPrepGateKey]  = 1,
        [FeatureStageLayout.FrontendPrepGateKey] = 2,
    };

    public static IEnumerable<FeatureGate> OrderedGates(Feature feature) =>
        feature.Gates
            .OrderBy(g => GateOrder.TryGetValue(g.GateKey, out var ord) ? ord : int.MaxValue)
            .ThenBy(g => g.Id);

    public static IEnumerable<FeatureSubStage> OrderedSubStages(Feature feature) =>
        feature.SubStages
            .OrderBy(s => (int)s.Track)
            .ThenBy(s => (int)s.PhaseKind)
            .ThenBy(s => s.Ordinal)
            .ThenBy(s => s.Id);
}
