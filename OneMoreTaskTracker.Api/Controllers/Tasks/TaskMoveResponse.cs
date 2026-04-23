namespace OneMoreTaskTracker.Api.Controllers;

public record TaskMoveResponse(string State, List<ProjectResponse> Projects);
