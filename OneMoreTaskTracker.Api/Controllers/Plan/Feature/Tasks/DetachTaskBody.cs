using System.ComponentModel.DataAnnotations;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Tasks;

public record DetachTaskBody([Required] int ReassignToFeatureId);
