using Mapster;
using OneMoreTaskTracker.Proto.Features;
using ProtoFeatureState = OneMoreTaskTracker.Proto.Features.FeatureState;
using CreateDto = OneMoreTaskTracker.Proto.Features.CreateFeatureCommand.FeatureDto;
using ListDto = OneMoreTaskTracker.Proto.Features.ListFeaturesQuery.FeatureDto;
using GetDto = OneMoreTaskTracker.Proto.Features.GetFeatureQuery.FeatureDto;
using PatchDto = OneMoreTaskTracker.Proto.Features.PatchFeatureCommand.FeatureDto;

namespace OneMoreTaskTracker.Features.Features.Data;

public static class FeatureMappingConfig
{
    private static readonly object RegisterLock = new();
    private static bool _registered;

    public static void Register()
    {
        lock (RegisterLock)
        {
            if (_registered) return;
            _registered = true;
        }

        FeatureGateMappingConfig.Register();
        FeatureSubStageMappingConfig.Register();

        RegisterFeatureToDto<CreateDto>();
        RegisterFeatureToDto<ListDto>();
        RegisterFeatureToDto<GetDto>();
        RegisterFeatureToDto<PatchDto>();
    }

    public static FeatureTaxonomyDto BuildProtoTaxonomy(Feature feature)
    {
        var taxonomy = new FeatureTaxonomyDto();
        foreach (var gate in FeatureTaxonomyProjector.OrderedGates(feature))
            taxonomy.Gates.Add(gate.Adapt<FeatureGateDto>());
        foreach (var sub in FeatureTaxonomyProjector.OrderedSubStages(feature))
            taxonomy.SubStages.Add(sub.Adapt<FeatureSubStageDto>());
        return taxonomy;
    }

    private static void RegisterFeatureToDto<TDto>()
        where TDto : class, IFeatureMappingTarget, new() =>
        TypeAdapterConfig<Feature, TDto>.NewConfig()
            .Map(d => d.Description, s => s.Description ?? string.Empty)
            .Map(d => d.State,        s => (ProtoFeatureState)s.State)
            .Map(d => d.PlannedStart, s => s.PlannedStart == null ? string.Empty : s.PlannedStart.Value.ToString("yyyy-MM-dd"))
            .Map(d => d.PlannedEnd,   s => s.PlannedEnd   == null ? string.Empty : s.PlannedEnd.Value.ToString("yyyy-MM-dd"))
            .Map(d => d.CreatedAt,    s => s.CreatedAt.ToString("O"))
            .Map(d => d.UpdatedAt,    s => s.UpdatedAt.ToString("O"))
            .Ignore(d => d.Taxonomy);
}
