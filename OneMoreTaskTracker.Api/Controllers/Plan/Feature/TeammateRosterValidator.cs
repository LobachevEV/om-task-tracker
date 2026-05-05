using Microsoft.AspNetCore.Mvc;
using OneMoreTaskTracker.Proto.Users;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature;

public static class TeammateRosterValidator
{
    public const string PickATeammateError = "Pick a teammate from the list";

    public static async Task<ActionResult?> ValidateAsync(
        IHasTeammateUserId payload,
        UserService.UserServiceClient userService,
        int callerUserId,
        ILogger logger,
        CancellationToken ct)
    {
        if (payload.TeammateUserId is not { } teammateUserId)
            return null;

        if (teammateUserId < 1)
            return new BadRequestObjectResult(new { error = PlanRequestHelpers.InvalidRequest });

        var roster = await userService.LoadRosterForManagerAsync(callerUserId, logger, ct);
        if (!roster.ContainsKey(teammateUserId))
            return new BadRequestObjectResult(new { error = PickATeammateError });

        return null;
    }
}
