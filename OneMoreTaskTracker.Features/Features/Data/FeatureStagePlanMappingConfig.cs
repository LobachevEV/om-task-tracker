using Mapster;
using ProtoFeatureStagePlan = OneMoreTaskTracker.Proto.Features.FeatureStagePlan;
using ProtoFeatureState = OneMoreTaskTracker.Proto.Features.FeatureState;

namespace OneMoreTaskTracker.Features.Features.Data;

// FeatureStagePlan is a single shared proto message (Protos/feature_stage_plan.proto,
// csharp_namespace = OneMoreTaskTracker.Proto.Features) — unlike FeatureDto, it is
// NOT redeclared per command/query, so a single Mapster registration covers every
// call site. Wire conventions mirror Feature's planned_* string handling:
//   null DateOnly            → "" on the wire
//   PerformerUserId == 0     → unassigned (proto3 scalar default)
public static class FeatureStagePlanMappingConfig
{
    public static void Register()
    {
        TypeAdapterConfig<FeatureStagePlan, ProtoFeatureStagePlan>.NewConfig()
            .Map(d => d.Stage,           s => (ProtoFeatureState)s.Stage)
            .Map(d => d.PlannedStart,    s => s.PlannedStart == null ? string.Empty : s.PlannedStart.Value.ToString("yyyy-MM-dd"))
            .Map(d => d.PlannedEnd,      s => s.PlannedEnd   == null ? string.Empty : s.PlannedEnd.Value.ToString("yyyy-MM-dd"))
            .Map(d => d.PerformerUserId, s => s.PerformerUserId);
    }
}
