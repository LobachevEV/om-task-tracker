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
}
