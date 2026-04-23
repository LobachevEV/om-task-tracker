using System.ComponentModel.DataAnnotations;

namespace OneMoreTaskTracker.Api.Controllers;

public record CreateTaskPayload(
    [Required][MinLength(1)][MaxLength(50)] string JiraId,
    [Range(1, int.MaxValue)] int FeatureId,
    DateTime? StartDate = null);
