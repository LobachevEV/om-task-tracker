namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature;

public record AttachedTaskResponse(int Id, string JiraId, string State, int UserId);
