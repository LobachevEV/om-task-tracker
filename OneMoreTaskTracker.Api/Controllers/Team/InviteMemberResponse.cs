namespace OneMoreTaskTracker.Api.Controllers;

public sealed record InviteMemberResponse(
    int UserId,
    string Email,
    string Role,
    int ManagerId,
    string TemporaryPassword);
