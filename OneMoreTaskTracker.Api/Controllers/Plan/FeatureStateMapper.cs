using OneMoreTaskTracker.Proto.Features;

namespace OneMoreTaskTracker.Api.Controllers.Plan;

internal static class FeatureStateMapper
{
    internal static string MapState(FeatureState state, ILogger logger) => state switch
    {
        FeatureState.CsApproving    => "CsApproving",
        FeatureState.Development    => "Development",
        FeatureState.Testing        => "Testing",
        FeatureState.EthalonTesting => "EthalonTesting",
        FeatureState.LiveRelease    => "LiveRelease",
        _ => LogAndReturnUnknown(state, logger)
    };

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

    private static string LogAndReturnUnknown(FeatureState state, ILogger logger)
    {
        logger.LogWarning("Unexpected FeatureState value {State}; returning \"Unknown\"", state);
        return "Unknown";
    }
}
