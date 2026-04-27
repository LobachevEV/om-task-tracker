namespace OneMoreTaskTracker.Api.Controllers.Tasks;

public record TaskMoveResponse(string State, List<ProjectResponse> Projects);
