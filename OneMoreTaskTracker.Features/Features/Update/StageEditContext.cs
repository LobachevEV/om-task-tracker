using OneMoreTaskTracker.Features.Features.Data;

namespace OneMoreTaskTracker.Features.Features.Update;

public readonly record struct StageEditContext(Feature Feature, FeatureStagePlan Plan, int StageOrdinal);
