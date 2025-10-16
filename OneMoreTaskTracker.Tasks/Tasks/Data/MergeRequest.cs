namespace OneMoreTaskTracker.Tasks.Tasks.Data;

public record MergeRequest
{
    public int Id { get; init; }
    public int TaskId { get; init; }
    public int ExternalProjectId { get; init; }
    public int ExternalId { get; init; }
    public required string Title { get; init; }
    public required string Link { get; init; }
    public string[] Labels { get; init; } = [];
}