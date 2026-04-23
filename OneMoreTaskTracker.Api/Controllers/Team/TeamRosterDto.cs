namespace OneMoreTaskTracker.Api.Controllers;

public sealed record TeamRosterDto(
    int UserId,
    string Email,
    string Role,
    int? ManagerId,
    string DisplayName,
    bool IsSelf,
    UserStatusDto Status);
