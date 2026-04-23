namespace OneMoreTaskTracker.Api.Controllers;

public sealed record UserStatusDto(
    int Active,
    DateTime? LastActive,
    StateMixDto Mix);
