namespace OneMoreTaskTracker.Api.Controllers.Team;

public sealed record InviteMemberResponse(
    int UserId,
    string Email,
    string Role,
    int ManagerId,
    string TemporaryPassword);
