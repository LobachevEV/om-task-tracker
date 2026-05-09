using System.ComponentModel.DataAnnotations;
using OneMoreTaskTracker.Api.Roster;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature;

public record UpdateFeaturePayload(
    [MaxLength(200)] string? Title = null,
    [MaxLength(4000)] string? Description = null,
    int? LeadUserId = null,
    string? CsApprovingPlannedStart = null,
    string? CsApprovingPlannedEnd = null,
    int? CsApprovingOwnerUserId = null,
    string? DevelopmentPlannedStart = null,
    string? DevelopmentPlannedEnd = null,
    int? DevelopmentOwnerUserId = null,
    string? TestingPlannedStart = null,
    string? TestingPlannedEnd = null,
    int? TestingOwnerUserId = null,
    string? EthalonTestingPlannedStart = null,
    string? EthalonTestingPlannedEnd = null,
    int? EthalonTestingOwnerUserId = null,
    string? LiveReleasePlannedStart = null,
    string? LiveReleasePlannedEnd = null,
    int? LiveReleaseOwnerUserId = null,
    int? ExpectedVersion = null) : IHasTeamMemberId
{
    public int? TeamMemberId => LeadUserId;
}
