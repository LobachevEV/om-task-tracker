using Mapster;
using ProtoFeatureState = OneMoreTaskTracker.Proto.Features.FeatureState;
using ProtoFeatureStagePlan = OneMoreTaskTracker.Proto.Features.FeatureStagePlan;
using CreateDto = OneMoreTaskTracker.Proto.Features.CreateFeatureCommand.FeatureDto;
using UpdateDto = OneMoreTaskTracker.Proto.Features.UpdateFeatureCommand.FeatureDto;
using ListDto = OneMoreTaskTracker.Proto.Features.ListFeaturesQuery.FeatureDto;
using GetDto = OneMoreTaskTracker.Proto.Features.GetFeatureQuery.FeatureDto;

namespace OneMoreTaskTracker.Features.Features.Data;

// Each proto file declares its own FeatureDto in its own C# namespace, so Mapster
// needs one registration per target type. State ordinals are shared with the C#
// FeatureState enum (feature_state.proto forgoes the *_UNSPECIFIED = 0 convention),
// so the proto cast has no offset.
//
// FeatureStagePlan is a single shared proto message (see FeatureStagePlanMappingConfig);
// we rely on Mapster's default convention-based mapping for the nested `StagePlans`
// collection — proto `repeated` fields expose an `AddRange` method that Mapster uses
// to populate the target. Canonical ordering (Stage ascending) is applied inside
// the handlers before adapt is called, so the wire order is deterministic.
public static class FeatureMappingConfig
{
    private static readonly object RegisterLock = new();
    private static bool _registered;

    public static void Register()
    {
        // Mapster forbids re-configuring an adapter after it has been used for
        // the first Adapt<> call (xUnit constructs the test class per test, so
        // without this guard the second construction throws). Registration is
        // once-per-process for the whole config, not per-DTO.
        lock (RegisterLock)
        {
            if (_registered) return;
            _registered = true;
        }

        // Register the child message mapping first so Mapster can pick it up for
        // the nested StagePlans property on each FeatureDto variant.
        FeatureStagePlanMappingConfig.Register();

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

    // Helper: produce a sorted-by-stage collection of proto FeatureStagePlan
    // messages from a Feature's navigation collection. The proto RepeatedField
    // exposes `Add(IEnumerable<T>)` so handlers can do `dto.StagePlans.Add(...)`
    // after the main Adapt<> call. Keeping the helper here keeps the mapping
    // surface for stage plans in one place (all Feature→*Dto registrations
    // delegate to the same conversion via this method).
    public static IEnumerable<ProtoFeatureStagePlan> BuildProtoStagePlans(Feature feature) =>
        feature.StagePlans
            .OrderBy(sp => sp.Stage)
            .Select(sp => sp.Adapt<ProtoFeatureStagePlan>());
}
