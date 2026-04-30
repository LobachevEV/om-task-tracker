namespace OneMoreTaskTracker.Api.Controllers.Plan;

internal static class ReleaseDateValidator
{
    internal const int MinReleaseYear = 2000;
    internal const int MaxReleaseYear = 2100;

    internal static string? Validate(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return null;

        if (!PlanRequestHelpers.TryParseIsoDate(raw, out var date))
            return "Date must be YYYY-MM-DD";

        if (date.Year < MinReleaseYear || date.Year > MaxReleaseYear)
            return "Use a real release date";

        return null;
    }
}
