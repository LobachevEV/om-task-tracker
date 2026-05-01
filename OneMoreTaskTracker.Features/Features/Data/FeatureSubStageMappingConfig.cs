using Mapster;
using OneMoreTaskTracker.Proto.Features;
using ProtoPhaseKind = OneMoreTaskTracker.Proto.Features.FeaturePhaseKind;

namespace OneMoreTaskTracker.Features.Features.Data;

public static class FeatureSubStageMappingConfig
{
    public static void Register()
    {
        TypeAdapterConfig<FeatureSubStage, FeatureSubStageDto>.NewConfig()
            .Map(d => d.Id,            s => s.Id)
            .Map(d => d.Track,         s => FeatureGateMappingConfig.MapTrack(s.Track))
            .Map(d => d.PhaseKind,     s => MapPhase(s.PhaseKind))
            .Map(d => d.Ordinal,       s => (int)s.Ordinal)
            .Map(d => d.OwnerUserId,   s => s.OwnerUserId)
            .Map(d => d.PlannedStart,  s => s.PlannedStart == null ? string.Empty : s.PlannedStart.Value.ToString("yyyy-MM-dd"))
            .Map(d => d.PlannedEnd,    s => s.PlannedEnd   == null ? string.Empty : s.PlannedEnd.Value.ToString("yyyy-MM-dd"))
            .Map(d => d.Version,       s => s.Version)
            .Map(d => d.CreatedAt,     s => s.CreatedAt.ToString("O"))
            .Map(d => d.UpdatedAt,     s => s.UpdatedAt.ToString("O"));
    }

    public static ProtoPhaseKind MapPhase(PhaseKind phase) => phase switch
    {
        PhaseKind.Development     => ProtoPhaseKind.PhaseKindDevelopment,
        PhaseKind.StandTesting    => ProtoPhaseKind.PhaseKindStandTesting,
        PhaseKind.EthalonTesting  => ProtoPhaseKind.PhaseKindEthalonTesting,
        PhaseKind.LiveRelease     => ProtoPhaseKind.PhaseKindLiveRelease,
        _                         => ProtoPhaseKind.PhaseKindDevelopment,
    };

    public static PhaseKind MapPhase(ProtoPhaseKind phase) => phase switch
    {
        ProtoPhaseKind.PhaseKindDevelopment     => PhaseKind.Development,
        ProtoPhaseKind.PhaseKindStandTesting    => PhaseKind.StandTesting,
        ProtoPhaseKind.PhaseKindEthalonTesting  => PhaseKind.EthalonTesting,
        ProtoPhaseKind.PhaseKindLiveRelease     => PhaseKind.LiveRelease,
        _                                       => PhaseKind.Development,
    };
}
