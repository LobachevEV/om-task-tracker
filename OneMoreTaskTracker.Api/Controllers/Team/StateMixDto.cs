namespace OneMoreTaskTracker.Api.Controllers;

public sealed record StateMixDto(
    int InDev,
    int MrToRelease,
    int InTest,
    int MrToMaster,
    int Completed);
