namespace OneMoreTaskTracker.Tasks.Tasks.Data;

public record GitRepo
{
    public int Id { get; init; }
    public int ExternalId { get; init; }
    public int TaskId { get; init; }
    public required string Name { get; init; }
    public required string Link { get; init; }
}