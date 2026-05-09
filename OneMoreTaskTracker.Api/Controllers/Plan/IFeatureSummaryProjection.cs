using OneMoreTaskTracker.Proto.Features;

namespace OneMoreTaskTracker.Api.Controllers.Plan;

internal interface IFeatureSummaryProjection
{
    int Id { get; }
    string Title { get; }
    string Description { get; }
    FeatureState State { get; }
    string PlannedStart { get; }
    string PlannedEnd { get; }
    int LeadUserId { get; }
    int ManagerUserId { get; }
    IEnumerable<FeatureTrackDto> Tracks { get; }
    int Version { get; }

    // Per-stage flat fields
    string CsApprovingPlannedStart { get; }
    string CsApprovingPlannedEnd { get; }
    int CsApprovingOwnerUserId { get; }

    string DevelopmentPlannedStart { get; }
    string DevelopmentPlannedEnd { get; }
    int DevelopmentOwnerUserId { get; }

    string TestingPlannedStart { get; }
    string TestingPlannedEnd { get; }
    int TestingOwnerUserId { get; }

    string EthalonTestingPlannedStart { get; }
    string EthalonTestingPlannedEnd { get; }
    int EthalonTestingOwnerUserId { get; }

    string LiveReleasePlannedStart { get; }
    string LiveReleasePlannedEnd { get; }
    int LiveReleaseOwnerUserId { get; }
}
