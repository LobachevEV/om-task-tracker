namespace OneMoreTaskTracker.Api.Controllers;

public record AttachedTaskResponse(int Id, string JiraId, string State, int UserId);
