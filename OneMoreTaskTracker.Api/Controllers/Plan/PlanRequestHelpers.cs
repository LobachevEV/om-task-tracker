using System.Globalization;
using System.Text.Json;
using Grpc.Core;
using OneMoreTaskTracker.Proto.Users;

namespace OneMoreTaskTracker.Api.Controllers.Plan;

internal static class PlanRequestHelpers
{
    internal const string InvalidRequest = "Invalid request data";

    internal static readonly IReadOnlyDictionary<int, List<int>> EmptyTasks =
        new Dictionary<int, List<int>>();

    internal static bool TryParseIsoDate(string? raw, out DateOnly value)
    {
        value = default;
        if (string.IsNullOrWhiteSpace(raw))
            return false;
        return DateOnly.TryParseExact(raw, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out value);
    }

    internal static bool TryValidateDateWindow(string? rawStart, string? rawEnd, out string? error)
    {
        error = null;

        var hasStart = !string.IsNullOrWhiteSpace(rawStart);
        var hasEnd = !string.IsNullOrWhiteSpace(rawEnd);

        DateOnly start = default;
        DateOnly end = default;

        if (hasStart && !TryParseIsoDate(rawStart, out start))
        {
            error = InvalidRequest;
            return false;
        }
        if (hasEnd && !TryParseIsoDate(rawEnd, out end))
        {
            error = InvalidRequest;
            return false;
        }
        if (hasStart && hasEnd && start > end)
        {
            error = InvalidRequest;
            return false;
        }
        return true;
    }

    // Decodes a tri-state owner field from JSON:
    //   absent  → (hasValue: false, protoValue: 0)  — don't set the proto field
    //   null    → (hasValue: true,  protoValue: -1) — clear (inherit); maps to proto sentinel -1
    //   integer → (hasValue: true,  protoValue: n)  — assign to user n
    internal static (bool HasValue, int ProtoValue) DecodeOwnerField(JsonElement? element)
    {
        if (element is null)
            return (false, 0);

        return element.Value.ValueKind switch
        {
            JsonValueKind.Null    => (true, -1),
            JsonValueKind.Number  => (true, element.Value.GetInt32()),
            _                     => (false, 0),
        };
    }

    // Returns null on missing/unparseable; explicit 0 round-trips so a freshly-created
    // feature can still send `If-Match: 0`. RFC 7232 quoted ETags are tolerated.
    internal static int? ParseIfMatch(string? ifMatch, ILogger logger)
    {
        if (string.IsNullOrWhiteSpace(ifMatch))
            return null;

        var trimmed = ifMatch.Trim().Trim('"');
        if (int.TryParse(trimmed, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed) && parsed >= 0)
            return parsed;

        logger.LogWarning("Could not parse If-Match header value '{IfMatch}'; proceeding in advisory mode", ifMatch);
        return null;
    }

    internal static async Task<IReadOnlyDictionary<int, TeamRosterMember>> LoadRosterForManagerAsync(
        this UserService.UserServiceClient userService,
        int managerId,
        ILogger logger,
        CancellationToken ct)
    {
        if (managerId <= 0)
            return new Dictionary<int, TeamRosterMember>();

        try
        {
            var roster = await userService.GetTeamRosterAsync(
                new GetTeamRosterRequest { ManagerId = managerId },
                cancellationToken: ct);
            return (roster.Members ?? []).ToDictionary(m => m.UserId);
        }
        catch (RpcException ex)
        {
            logger.LogWarning(ex, "Failed to load roster for manager {ManagerId}", managerId);
            return new Dictionary<int, TeamRosterMember>();
        }
    }
}
