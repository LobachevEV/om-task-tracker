using OneMoreTaskTracker.Proto.Features;

namespace OneMoreTaskTracker.Api.Controllers.Plan;

internal static class FeatureStateMapper
{
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
}
