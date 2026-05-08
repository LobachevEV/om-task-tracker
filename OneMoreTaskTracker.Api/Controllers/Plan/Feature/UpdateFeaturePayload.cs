using System.ComponentModel.DataAnnotations;
using OneMoreTaskTracker.Api.Roster;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature;

public record UpdateFeaturePayload(
    [MaxLength(200)] string? Title,
    [MaxLength(4000)] string? Description,
    int? LeadUserId,
    int? ExpectedVersion = null) : IHasTeamMemberId
{
    public int? TeamMemberId => LeadUserId;
}
