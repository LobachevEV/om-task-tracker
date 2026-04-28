using OneMoreTaskTracker.Features.Features.Data;

namespace OneMoreTaskTracker.Features.Features.Update;

internal static class StagePlanUpserter
{
    public static void RecomputeFeatureDates(Feature feature)
    {
        DateOnly? minStart = null;
        DateOnly? maxEnd = null;

        foreach (var sp in feature.StagePlans)
        {
            if (sp.PlannedStart is { } s && (minStart is null || s < minStart))
                minStart = s;
            if (sp.PlannedEnd is { } e && (maxEnd is null || e > maxEnd))
                maxEnd = e;
        }

        feature.PlannedStart = minStart;
        feature.PlannedEnd   = maxEnd;
    }
}
