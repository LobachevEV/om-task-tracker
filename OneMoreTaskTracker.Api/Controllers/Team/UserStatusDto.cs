namespace OneMoreTaskTracker.Api.Controllers.Team;

public sealed record UserStatusDto(
    int Active,
    DateTime? LastActive,
    StateMixDto Mix);
