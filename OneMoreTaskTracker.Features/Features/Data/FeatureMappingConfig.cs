using Mapster;
using ProtoFeatureState = OneMoreTaskTracker.Proto.Features.FeatureState;
using ProtoFeatureStagePlan = OneMoreTaskTracker.Proto.Features.FeatureStagePlan;
using CreateDto = OneMoreTaskTracker.Proto.Features.CreateFeatureCommand.FeatureDto;
using ListDto = OneMoreTaskTracker.Proto.Features.ListFeaturesQuery.FeatureDto;
using GetDto = OneMoreTaskTracker.Proto.Features.GetFeatureQuery.FeatureDto;
using PatchDto = OneMoreTaskTracker.Proto.Features.PatchFeatureCommand.FeatureDto;
using PatchStageDto = OneMoreTaskTracker.Proto.Features.PatchFeatureStageCommand.FeatureDto;

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

        FeatureStagePlanMappingConfig.Register();

        TypeAdapterConfig<Feature, ListDto>.NewConfig()
            .Map(d => d.Id,             s => s.Id)
            .Map(d => d.Title,          s => s.Title)
            .Map(d => d.Description,    s => s.Description ?? string.Empty)
            .Map(d => d.State,          s => (ProtoFeatureState)s.State)
            .Map(d => d.PlannedStart,   s => s.PlannedStart == null ? string.Empty : s.PlannedStart.Value.ToString("yyyy-MM-dd"))
            .Map(d => d.PlannedEnd,     s => s.PlannedEnd   == null ? string.Empty : s.PlannedEnd.Value.ToString("yyyy-MM-dd"))
            .Map(d => d.LeadUserId,     s => s.LeadUserId)
            .Map(d => d.ManagerUserId,  s => s.ManagerUserId)
            .Map(d => d.CreatedAt,      s => s.CreatedAt.ToString("O"))
            .Map(d => d.UpdatedAt,      s => s.UpdatedAt.ToString("O"))
            .Map(d => d.Version,        s => s.Version);

        TypeAdapterConfig<Feature, GetDto>.NewConfig()
            .Map(d => d.Id,             s => s.Id)
            .Map(d => d.Title,          s => s.Title)
            .Map(d => d.Description,    s => s.Description ?? string.Empty)
            .Map(d => d.State,          s => (ProtoFeatureState)s.State)
            .Map(d => d.PlannedStart,   s => s.PlannedStart == null ? string.Empty : s.PlannedStart.Value.ToString("yyyy-MM-dd"))
            .Map(d => d.PlannedEnd,     s => s.PlannedEnd   == null ? string.Empty : s.PlannedEnd.Value.ToString("yyyy-MM-dd"))
            .Map(d => d.LeadUserId,     s => s.LeadUserId)
            .Map(d => d.ManagerUserId,  s => s.ManagerUserId)
            .Map(d => d.CreatedAt,      s => s.CreatedAt.ToString("O"))
            .Map(d => d.UpdatedAt,      s => s.UpdatedAt.ToString("O"))
            .Map(d => d.Version,        s => s.Version);

        TypeAdapterConfig<Feature, PatchDto>.NewConfig()
            .Map(d => d.Id,             s => s.Id)
            .Map(d => d.Title,          s => s.Title)
            .Map(d => d.Description,    s => s.Description ?? string.Empty)
            .Map(d => d.State,          s => (ProtoFeatureState)s.State)
            .Map(d => d.PlannedStart,   s => s.PlannedStart == null ? string.Empty : s.PlannedStart.Value.ToString("yyyy-MM-dd"))
            .Map(d => d.PlannedEnd,     s => s.PlannedEnd   == null ? string.Empty : s.PlannedEnd.Value.ToString("yyyy-MM-dd"))
            .Map(d => d.LeadUserId,     s => s.LeadUserId)
            .Map(d => d.ManagerUserId,  s => s.ManagerUserId)
            .Map(d => d.CreatedAt,      s => s.CreatedAt.ToString("O"))
            .Map(d => d.UpdatedAt,      s => s.UpdatedAt.ToString("O"))
            .Map(d => d.Version,        s => s.Version);

        TypeAdapterConfig<Feature, PatchStageDto>.NewConfig()
            .Map(d => d.Id,             s => s.Id)
            .Map(d => d.Title,          s => s.Title)
            .Map(d => d.Description,    s => s.Description ?? string.Empty)
            .Map(d => d.State,          s => (ProtoFeatureState)s.State)
            .Map(d => d.PlannedStart,   s => s.PlannedStart == null ? string.Empty : s.PlannedStart.Value.ToString("yyyy-MM-dd"))
            .Map(d => d.PlannedEnd,     s => s.PlannedEnd   == null ? string.Empty : s.PlannedEnd.Value.ToString("yyyy-MM-dd"))
            .Map(d => d.LeadUserId,     s => s.LeadUserId)
            .Map(d => d.ManagerUserId,  s => s.ManagerUserId)
            .Map(d => d.CreatedAt,      s => s.CreatedAt.ToString("O"))
            .Map(d => d.UpdatedAt,      s => s.UpdatedAt.ToString("O"))
            .Map(d => d.Version,        s => s.Version);
    }

    public static IEnumerable<ProtoFeatureStagePlan> BuildProtoStagePlans(Feature feature) =>
        feature.StagePlans
            .OrderBy(sp => sp.Stage)
            .Select(sp => sp.Adapt<ProtoFeatureStagePlan>());
}
