using System.ComponentModel.DataAnnotations;

namespace OneMoreTaskTracker.Api.Controllers;

public record DetachTaskBody([Required] int ReassignToFeatureId);
