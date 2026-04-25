using System.ComponentModel.DataAnnotations;

namespace OneMoreTaskTracker.Api.Controllers.Team;

public sealed record InviteMemberRequest(
    [Required][EmailAddress][MaxLength(254)] string Email,
    [Required] string Role);
