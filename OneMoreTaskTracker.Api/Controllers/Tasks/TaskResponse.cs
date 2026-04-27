namespace OneMoreTaskTracker.Api.Controllers.Tasks;

public record TaskResponse(int Id, string JiraId, string State, int UserId);
