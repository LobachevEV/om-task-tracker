namespace OneMoreTaskTracker.Features.Features.Data;

public interface ITrackedEntity
{
    int Version { get; set; }
    DateTime UpdatedAt { get; set; }
}
