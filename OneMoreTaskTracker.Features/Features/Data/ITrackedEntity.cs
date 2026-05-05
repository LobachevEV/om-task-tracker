namespace OneMoreTaskTracker.Features.Features.Data;

public interface ITrackedEntity
{
    int Version { get; set; }
    DateTime CreatedAt { get; set; }
    DateTime UpdatedAt { get; set; }
}
