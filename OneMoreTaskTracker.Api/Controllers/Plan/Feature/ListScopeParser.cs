namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature;

internal static class ListScopeParser
{
    internal static bool TryParse(string? raw, out ListScopeKind kind)
    {
        kind = ListScopeKind.All;

        if (string.IsNullOrEmpty(raw))
            return true;

        if (string.Equals(raw, "all", StringComparison.OrdinalIgnoreCase))
            return true;

        if (string.Equals(raw, "mine", StringComparison.OrdinalIgnoreCase))
        {
            kind = ListScopeKind.Mine;
            return true;
        }

        return false;
    }
}
