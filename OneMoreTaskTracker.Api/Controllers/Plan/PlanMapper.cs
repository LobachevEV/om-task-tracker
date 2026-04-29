using OneMoreTaskTracker.Api.Controllers.Plan.Feature;
using OneMoreTaskTracker.Api.Controllers.Plan.Feature.Stages;
using OneMoreTaskTracker.Proto.Features;
using OneMoreTaskTracker.Proto.Users;
using ProtoFeatureStagePlan = OneMoreTaskTracker.Proto.Features.FeatureStagePlan;
using PatchFeatureDto = OneMoreTaskTracker.Proto.Features.PatchFeatureCommand.FeatureDto;
using PatchFeatureStageDto = OneMoreTaskTracker.Proto.Features.PatchFeatureStageCommand.FeatureDto;

namespace OneMoreTaskTracker.Api.Controllers.Plan;

internal static class PlanMapper
{
    internal static string MapState(FeatureState state, ILogger logger) => state switch
    {
        FeatureState.CsApproving   => "CsApproving",
        FeatureState.Development   => "Development",
        FeatureState.Testing       => "Testing",
        FeatureState.EthalonTesting => "EthalonTesting",
        FeatureState.LiveRelease   => "LiveRelease",
        _ => LogAndReturnUnknown(state, logger)
    };

    private static string LogAndReturnUnknown(FeatureState state, ILogger logger)
    {
        logger.LogWarning("Unexpected FeatureState value {State}; returning \"Unknown\"", state);
        return "Unknown";
    }

    internal static FeatureState ParseState(string? input) => input switch
    {
        "CsApproving"    => FeatureState.CsApproving,
        "Development"    => FeatureState.Development,
        "Testing"        => FeatureState.Testing,
        "EthalonTesting" => FeatureState.EthalonTesting,
        "LiveRelease"    => FeatureState.LiveRelease,
        _                => FeatureState.CsApproving
    };

    internal static bool TryParseStage(string raw, out FeatureState stage)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            stage = default;
            return false;
        }

        // Reject numeric input — Enum.TryParse would otherwise accept underlying-int values.
        if (char.IsDigit(raw[0]) || raw[0] == '-' || raw[0] == '+')
        {
            stage = default;
            return false;
        }

        if (Enum.TryParse<FeatureState>(raw, ignoreCase: true, out var parsed)
            && Enum.IsDefined(typeof(FeatureState), parsed))
        {
            stage = parsed;
            return true;
        }

        stage = default;
        return false;
    }

    // Pre-check at the gateway so the friendly copy reaches the FE rather than
    // being generalised to "Invalid request data" by GrpcExceptionMiddleware.
    internal const int MinReleaseYear = 2000;
    internal const int MaxReleaseYear = 2100;

    internal static string? ValidateOptionalReleaseDate(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return null;

        if (!DateOnly.TryParseExact(raw, "yyyy-MM-dd", out var date))
            return "Date must be YYYY-MM-DD";

        if (date.Year < MinReleaseYear || date.Year > MaxReleaseYear)
            return "Use a real release date";

        return null;
    }

    internal static MiniTeamMemberResponse BuildMiniTeamMember(
        int userId,
        IReadOnlyDictionary<int, TeamRosterMember> roster)
    {
        if (userId <= 0)
            return new MiniTeamMemberResponse(0, string.Empty, string.Empty, string.Empty);

        if (roster.TryGetValue(userId, out var member))
            return new MiniTeamMemberResponse(
                member.UserId,
                member.Email,
                ExtractDisplayName(member.Email),
                member.Role);

        return new MiniTeamMemberResponse(userId, string.Empty, string.Empty, string.Empty);
    }

    internal static StagePlanResponse BuildStagePlan(ProtoFeatureStagePlan sp, ILogger logger) =>
        new(
            MapState(sp.Stage, logger),
            string.IsNullOrEmpty(sp.PlannedStart) ? null : sp.PlannedStart,
            string.IsNullOrEmpty(sp.PlannedEnd)   ? null : sp.PlannedEnd,
            sp.PerformerUserId > 0 ? (int?)sp.PerformerUserId : null,
            sp.Version);

    internal static FeatureSummaryResponse MapSummary(
        CreateFeatureDto f,
        IReadOnlyDictionary<int, List<int>> tasksByFeature,
        ILogger logger) =>
        BuildSummary(f.Id, f.Title, f.Description, f.State, f.PlannedStart, f.PlannedEnd,
            f.LeadUserId, f.ManagerUserId, f.StagePlans, f.Version, tasksByFeature, logger);

    internal static FeatureSummaryResponse MapSummary(
        ListFeatureDto f,
        IReadOnlyDictionary<int, List<int>> tasksByFeature,
        ILogger logger) =>
        BuildSummary(f.Id, f.Title, f.Description, f.State, f.PlannedStart, f.PlannedEnd,
            f.LeadUserId, f.ManagerUserId, f.StagePlans, f.Version, tasksByFeature, logger);

    internal static FeatureSummaryResponse MapSummary(
        GetFeatureDto f,
        IReadOnlyDictionary<int, List<int>> tasksByFeature,
        ILogger logger) =>
        BuildSummary(f.Id, f.Title, f.Description, f.State, f.PlannedStart, f.PlannedEnd,
            f.LeadUserId, f.ManagerUserId, f.StagePlans, f.Version, tasksByFeature, logger);

    internal static FeatureSummaryResponse MapSummary(
        PatchFeatureDto f,
        IReadOnlyDictionary<int, List<int>> tasksByFeature,
        ILogger logger) =>
        BuildSummary(f.Id, f.Title, f.Description, f.State, f.PlannedStart, f.PlannedEnd,
            f.LeadUserId, f.ManagerUserId, f.StagePlans, f.Version, tasksByFeature, logger);

    internal static FeatureSummaryResponse MapSummary(
        PatchFeatureStageDto f,
        IReadOnlyDictionary<int, List<int>> tasksByFeature,
        ILogger logger) =>
        BuildSummary(f.Id, f.Title, f.Description, f.State, f.PlannedStart, f.PlannedEnd,
            f.LeadUserId, f.ManagerUserId, f.StagePlans, f.Version, tasksByFeature, logger);

    private static FeatureSummaryResponse BuildSummary(
        int id,
        string title,
        string description,
        FeatureState state,
        string plannedStart,
        string plannedEnd,
        int leadUserId,
        int managerUserId,
        IEnumerable<ProtoFeatureStagePlan> stagePlans,
        int version,
        IReadOnlyDictionary<int, List<int>> tasksByFeature,
        ILogger logger)
    {
        var taskIds = tasksByFeature.TryGetValue(f.Id, out var ids) ? (IReadOnlyList<int>)ids : Array.Empty<int>();
        var plans = f.StagePlans.Select(sp => BuildStagePlan(sp, logger)).ToList();
        return new FeatureSummaryResponse(
            f.Id,
            f.Title,
            string.IsNullOrEmpty(f.Description) ? null : f.Description,
            MapState(f.State, logger),
            string.IsNullOrEmpty(f.PlannedStart) ? null : f.PlannedStart,
            string.IsNullOrEmpty(f.PlannedEnd)   ? null : f.PlannedEnd,
            f.LeadUserId,
            f.ManagerUserId,
            taskIds.Count,
            taskIds,
            plans,
            f.Version);
    }

    internal static string ExtractDisplayName(string email)
    {
        if (string.IsNullOrEmpty(email))
            return string.Empty;
        var local = email.Split('@')[0];
        return string.Join(" ", local.Split('.', '-', '_').Select(p =>
            p.Length == 0 ? p : char.ToUpperInvariant(p[0]) + p[1..]));
    }
}
