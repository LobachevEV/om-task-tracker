using OneMoreTaskTracker.Proto.Features;
using OneMoreTaskTracker.Proto.Users;
using CreateFeatureDto = OneMoreTaskTracker.Proto.Features.CreateFeatureCommand.FeatureDto;
using GetFeatureDto = OneMoreTaskTracker.Proto.Features.GetFeatureQuery.FeatureDto;
using ListFeatureDto = OneMoreTaskTracker.Proto.Features.ListFeaturesQuery.FeatureDto;
using ProtoFeatureStagePlan = OneMoreTaskTracker.Proto.Features.FeatureStagePlan;
using UpdateFeatureDto = OneMoreTaskTracker.Proto.Features.UpdateFeatureCommand.FeatureDto;
using UpdateFeatureTitleDto = OneMoreTaskTracker.Proto.Features.UpdateFeatureTitleCommand.FeatureDto;
using UpdateFeatureDescriptionDto = OneMoreTaskTracker.Proto.Features.UpdateFeatureDescriptionCommand.FeatureDto;
using UpdateStageOwnerDto = OneMoreTaskTracker.Proto.Features.UpdateStageOwnerCommand.FeatureDto;
using UpdateStagePlannedStartDto = OneMoreTaskTracker.Proto.Features.UpdateStagePlannedStartCommand.FeatureDto;
using UpdateStagePlannedEndDto = OneMoreTaskTracker.Proto.Features.UpdateStagePlannedEndCommand.FeatureDto;

namespace OneMoreTaskTracker.Api.Controllers;

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
        UpdateFeatureDto f,
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
        UpdateFeatureTitleDto f,
        IReadOnlyDictionary<int, List<int>> tasksByFeature,
        ILogger logger) =>
        BuildSummary(f.Id, f.Title, f.Description, f.State, f.PlannedStart, f.PlannedEnd,
            f.LeadUserId, f.ManagerUserId, f.StagePlans, f.Version, tasksByFeature, logger);

    internal static FeatureSummaryResponse MapSummary(
        UpdateFeatureDescriptionDto f,
        IReadOnlyDictionary<int, List<int>> tasksByFeature,
        ILogger logger) =>
        BuildSummary(f.Id, f.Title, f.Description, f.State, f.PlannedStart, f.PlannedEnd,
            f.LeadUserId, f.ManagerUserId, f.StagePlans, f.Version, tasksByFeature, logger);

    internal static FeatureSummaryResponse MapSummary(
        UpdateStageOwnerDto f,
        IReadOnlyDictionary<int, List<int>> tasksByFeature,
        ILogger logger) =>
        BuildSummary(f.Id, f.Title, f.Description, f.State, f.PlannedStart, f.PlannedEnd,
            f.LeadUserId, f.ManagerUserId, f.StagePlans, f.Version, tasksByFeature, logger);

    internal static FeatureSummaryResponse MapSummary(
        UpdateStagePlannedStartDto f,
        IReadOnlyDictionary<int, List<int>> tasksByFeature,
        ILogger logger) =>
        BuildSummary(f.Id, f.Title, f.Description, f.State, f.PlannedStart, f.PlannedEnd,
            f.LeadUserId, f.ManagerUserId, f.StagePlans, f.Version, tasksByFeature, logger);

    internal static FeatureSummaryResponse MapSummary(
        UpdateStagePlannedEndDto f,
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
        var taskIds = tasksByFeature.TryGetValue(id, out var ids) ? (IReadOnlyList<int>)ids : Array.Empty<int>();
        var plans = stagePlans.Select(sp => BuildStagePlan(sp, logger)).ToList();
        return new FeatureSummaryResponse(
            id,
            title,
            string.IsNullOrEmpty(description) ? null : description,
            MapState(state, logger),
            string.IsNullOrEmpty(plannedStart) ? null : plannedStart,
            string.IsNullOrEmpty(plannedEnd)   ? null : plannedEnd,
            leadUserId,
            managerUserId,
            taskIds.Count,
            taskIds,
            plans,
            version);
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
