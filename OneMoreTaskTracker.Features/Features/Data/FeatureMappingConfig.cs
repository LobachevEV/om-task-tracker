using Mapster;
using ProtoFeatureState = OneMoreTaskTracker.Proto.Features.FeatureState;
using CreateDto = OneMoreTaskTracker.Proto.Features.CreateFeatureCommand.FeatureDto;
using UpdateDto = OneMoreTaskTracker.Proto.Features.UpdateFeatureCommand.FeatureDto;
using ListDto = OneMoreTaskTracker.Proto.Features.ListFeaturesQuery.FeatureDto;
using GetDto = OneMoreTaskTracker.Proto.Features.GetFeatureQuery.FeatureDto;

namespace OneMoreTaskTracker.Features.Features.Data;

// Each proto file declares its own FeatureDto in its own C# namespace, so Mapster
// needs one registration per target type. State ordinals are shared with the C#
// FeatureState enum (feature_state.proto forgoes the *_UNSPECIFIED = 0 convention),
// so the proto cast has no offset.
public static class FeatureMappingConfig
{
    public static void Register()
    {
        TypeAdapterConfig<Feature, CreateDto>.NewConfig()
            .Map(d => d.Id,             s => s.Id)
            .Map(d => d.Title,          s => s.Title)
            .Map(d => d.Description,    s => s.Description ?? string.Empty)
            .Map(d => d.State,          s => (ProtoFeatureState)s.State)
            .Map(d => d.PlannedStart,   s => s.PlannedStart == null ? string.Empty : s.PlannedStart.Value.ToString("yyyy-MM-dd"))
            .Map(d => d.PlannedEnd,     s => s.PlannedEnd   == null ? string.Empty : s.PlannedEnd.Value.ToString("yyyy-MM-dd"))
            .Map(d => d.LeadUserId,     s => s.LeadUserId)
            .Map(d => d.ManagerUserId,  s => s.ManagerUserId)
            .Map(d => d.CreatedAt,      s => s.CreatedAt.ToString("O"))
            .Map(d => d.UpdatedAt,      s => s.UpdatedAt.ToString("O"));

        TypeAdapterConfig<Feature, UpdateDto>.NewConfig()
            .Map(d => d.Id,             s => s.Id)
            .Map(d => d.Title,          s => s.Title)
            .Map(d => d.Description,    s => s.Description ?? string.Empty)
            .Map(d => d.State,          s => (ProtoFeatureState)s.State)
            .Map(d => d.PlannedStart,   s => s.PlannedStart == null ? string.Empty : s.PlannedStart.Value.ToString("yyyy-MM-dd"))
            .Map(d => d.PlannedEnd,     s => s.PlannedEnd   == null ? string.Empty : s.PlannedEnd.Value.ToString("yyyy-MM-dd"))
            .Map(d => d.LeadUserId,     s => s.LeadUserId)
            .Map(d => d.ManagerUserId,  s => s.ManagerUserId)
            .Map(d => d.CreatedAt,      s => s.CreatedAt.ToString("O"))
            .Map(d => d.UpdatedAt,      s => s.UpdatedAt.ToString("O"));

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
            .Map(d => d.UpdatedAt,      s => s.UpdatedAt.ToString("O"));

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
            .Map(d => d.UpdatedAt,      s => s.UpdatedAt.ToString("O"));
    }
}
