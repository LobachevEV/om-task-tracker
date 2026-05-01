using Mapster;
using OneMoreTaskTracker.Proto.Features;
using ProtoGateKind = OneMoreTaskTracker.Proto.Features.FeatureGateKind;
using ProtoGateStatus = OneMoreTaskTracker.Proto.Features.FeatureGateStatus;
using ProtoTrack = OneMoreTaskTracker.Proto.Features.FeatureTrack;

namespace OneMoreTaskTracker.Features.Features.Data;

public static class FeatureGateMappingConfig
{
    public static void Register()
    {
        TypeAdapterConfig<FeatureGate, FeatureGateDto>.NewConfig()
            .Map(d => d.Id,             s => s.Id)
            .Map(d => d.GateKey,        s => s.GateKey)
            .Map(d => d.Kind,           s => MapKind(s.Kind))
            .Map(d => d.Status,         s => MapStatus(s.Status))
            .Map(d => d.Track,          s => s.Track == null ? (ProtoTrack?)null : MapTrack(s.Track.Value))
            .Map(d => d.ApproverUserId, s => s.ApproverUserId)
            .Map(d => d.ApprovedAtUtc,  s => s.ApprovedAtUtc == null ? string.Empty : s.ApprovedAtUtc.Value.ToString("O"))
            .Map(d => d.RequestedAtUtc, s => s.RequestedAtUtc == null ? string.Empty : s.RequestedAtUtc.Value.ToString("O"))
            .Map(d => d.RejectionReason,s => s.RejectionReason ?? string.Empty)
            .Map(d => d.Version,        s => s.Version)
            .Map(d => d.CreatedAt,      s => s.CreatedAt.ToString("O"))
            .Map(d => d.UpdatedAt,      s => s.UpdatedAt.ToString("O"));
    }

    public static ProtoGateKind MapKind(GateKind kind) => kind switch
    {
        GateKind.Spec => ProtoGateKind.GateKindSpec,
        GateKind.Cs   => ProtoGateKind.GateKindCs,
        GateKind.Sr   => ProtoGateKind.GateKindSr,
        _             => ProtoGateKind.GateKindSpec,
    };

    public static ProtoGateStatus MapStatus(GateStatus status) => status switch
    {
        GateStatus.Waiting  => ProtoGateStatus.GateStatusWaiting,
        GateStatus.Approved => ProtoGateStatus.GateStatusApproved,
        GateStatus.Rejected => ProtoGateStatus.GateStatusRejected,
        _                   => ProtoGateStatus.GateStatusWaiting,
    };

    public static ProtoTrack MapTrack(Track track) => track switch
    {
        Track.Backend  => ProtoTrack.TrackBackend,
        Track.Frontend => ProtoTrack.TrackFrontend,
        _              => ProtoTrack.TrackBackend,
    };

    public static Track MapTrack(ProtoTrack track) => track switch
    {
        ProtoTrack.TrackBackend  => Track.Backend,
        ProtoTrack.TrackFrontend => Track.Frontend,
        _                        => Track.Backend,
    };
}
