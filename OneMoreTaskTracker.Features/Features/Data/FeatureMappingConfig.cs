using Mapster;
using ProtoFeatureState = OneMoreTaskTracker.Proto.Features.FeatureState;
using ProtoFeatureTrackDto = OneMoreTaskTracker.Proto.Features.FeatureTrackDto;
using ProtoFeatureTrackStageDto = OneMoreTaskTracker.Proto.Features.FeatureTrackStageDto;
using ProtoFeatureTrackKind = OneMoreTaskTracker.Proto.Features.FeatureTrackKind;
using ProtoFeatureTrackStageKey = OneMoreTaskTracker.Proto.Features.FeatureTrackStageKey;
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

        RegisterFeatureToDto<CreateDto>();
        RegisterFeatureToDto<ListDto>();
        RegisterFeatureToDto<GetDto>();
        RegisterFeatureToDto<PatchDto>();
    }

    public static IEnumerable<ProtoFeatureTrackDto> BuildProtoTracks(Feature feature) =>
        feature.Tracks
            .OrderBy(t => t.Kind)
            .Select(BuildProtoTrack);

    public static ProtoFeatureTrackDto BuildProtoTrack(FeatureTrack track)
    {
        var dto = new ProtoFeatureTrackDto
        {
            Id = track.Id,
            FeatureId = track.FeatureId,
            Kind = (ProtoFeatureTrackKind)track.Kind,
            TrackOwnerUserId = track.TrackOwnerUserId,
            Version = track.Version,
        };
        dto.Stages.AddRange(BuildProtoTrackStages(track));
        return dto;
    }

    public static IEnumerable<ProtoFeatureTrackStageDto> BuildProtoTrackStages(FeatureTrack track) =>
        track.Stages
            .OrderBy(s => s.StageKey)
            .Select(s => new ProtoFeatureTrackStageDto
            {
                StageKey = (ProtoFeatureTrackStageKey)s.StageKey,
                PlannedStart = s.PlannedStart == null ? string.Empty : s.PlannedStart.Value.ToString("yyyy-MM-dd"),
                PlannedEnd = s.PlannedEnd == null ? string.Empty : s.PlannedEnd.Value.ToString("yyyy-MM-dd"),
                StageOwnerUserId = s.StageOwnerUserId ?? 0,
                StageVersion = s.Version,
            });

    private static void RegisterFeatureToDto<TDto>()
        where TDto : class, IFeatureMappingTarget, new() =>
        TypeAdapterConfig<Feature, TDto>.NewConfig()
            .Map(d => d.Description, s => s.Description ?? string.Empty)
            .Map(d => d.State,        s => (ProtoFeatureState)s.State)
            .Map(d => d.PlannedStart, s => s.PlannedStart == null ? string.Empty : s.PlannedStart.Value.ToString("yyyy-MM-dd"))
            .Map(d => d.PlannedEnd,   s => s.PlannedEnd   == null ? string.Empty : s.PlannedEnd.Value.ToString("yyyy-MM-dd"))
            .Map(d => d.CreatedAt,    s => s.CreatedAt.ToString("O"))
            .Map(d => d.UpdatedAt,    s => s.UpdatedAt.ToString("O"))
            .Map(d => d.CsApprovingPlannedStart,    s => s.CsApprovingPlannedStart    == null ? string.Empty : s.CsApprovingPlannedStart.Value.ToString("yyyy-MM-dd"))
            .Map(d => d.CsApprovingPlannedEnd,      s => s.CsApprovingPlannedEnd      == null ? string.Empty : s.CsApprovingPlannedEnd.Value.ToString("yyyy-MM-dd"))
            .Map(d => d.CsApprovingOwnerUserId,     s => s.CsApprovingOwnerUserId     ?? 0)
            .Map(d => d.DevelopmentPlannedStart,    s => s.DevelopmentPlannedStart    == null ? string.Empty : s.DevelopmentPlannedStart.Value.ToString("yyyy-MM-dd"))
            .Map(d => d.DevelopmentPlannedEnd,      s => s.DevelopmentPlannedEnd      == null ? string.Empty : s.DevelopmentPlannedEnd.Value.ToString("yyyy-MM-dd"))
            .Map(d => d.DevelopmentOwnerUserId,     s => s.DevelopmentOwnerUserId     ?? 0)
            .Map(d => d.TestingPlannedStart,        s => s.TestingPlannedStart        == null ? string.Empty : s.TestingPlannedStart.Value.ToString("yyyy-MM-dd"))
            .Map(d => d.TestingPlannedEnd,          s => s.TestingPlannedEnd          == null ? string.Empty : s.TestingPlannedEnd.Value.ToString("yyyy-MM-dd"))
            .Map(d => d.TestingOwnerUserId,         s => s.TestingOwnerUserId         ?? 0)
            .Map(d => d.EthalonTestingPlannedStart, s => s.EthalonTestingPlannedStart == null ? string.Empty : s.EthalonTestingPlannedStart.Value.ToString("yyyy-MM-dd"))
            .Map(d => d.EthalonTestingPlannedEnd,   s => s.EthalonTestingPlannedEnd   == null ? string.Empty : s.EthalonTestingPlannedEnd.Value.ToString("yyyy-MM-dd"))
            .Map(d => d.EthalonTestingOwnerUserId,  s => s.EthalonTestingOwnerUserId  ?? 0)
            .Map(d => d.LiveReleasePlannedStart,    s => s.LiveReleasePlannedStart    == null ? string.Empty : s.LiveReleasePlannedStart.Value.ToString("yyyy-MM-dd"))
            .Map(d => d.LiveReleasePlannedEnd,      s => s.LiveReleasePlannedEnd      == null ? string.Empty : s.LiveReleasePlannedEnd.Value.ToString("yyyy-MM-dd"))
            .Map(d => d.LiveReleaseOwnerUserId,     s => s.LiveReleaseOwnerUserId     ?? 0);
}
