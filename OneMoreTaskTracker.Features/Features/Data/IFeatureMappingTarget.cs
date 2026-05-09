namespace OneMoreTaskTracker.Features.Features.Data;

internal interface IFeatureMappingTarget
{
    int Id { get; set; }
    string Title { get; set; }
    string Description { get; set; }
    OneMoreTaskTracker.Proto.Features.FeatureState State { get; set; }
    string PlannedStart { get; set; }
    string PlannedEnd { get; set; }
    int LeadUserId { get; set; }
    int ManagerUserId { get; set; }
    string CreatedAt { get; set; }
    string UpdatedAt { get; set; }
    int Version { get; set; }
    string CsApprovingPlannedStart { get; set; }
    string CsApprovingPlannedEnd { get; set; }
    int CsApprovingOwnerUserId { get; set; }
    string DevelopmentPlannedStart { get; set; }
    string DevelopmentPlannedEnd { get; set; }
    int DevelopmentOwnerUserId { get; set; }
    string TestingPlannedStart { get; set; }
    string TestingPlannedEnd { get; set; }
    int TestingOwnerUserId { get; set; }
    string EthalonTestingPlannedStart { get; set; }
    string EthalonTestingPlannedEnd { get; set; }
    int EthalonTestingOwnerUserId { get; set; }
    string LiveReleasePlannedStart { get; set; }
    string LiveReleasePlannedEnd { get; set; }
    int LiveReleaseOwnerUserId { get; set; }
}
