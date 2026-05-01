using OneMoreTaskTracker.Features.Features.Data;

namespace OneMoreTaskTracker.Features.Features.Update;

public static class SubStageOrderRule
{
    public static short? FindOverlappingNeighbor(
        IEnumerable<FeatureSubStage> otherSiblings,
        DateOnly? candidateStart,
        DateOnly? candidateEnd)
    {
        if (candidateStart is null || candidateEnd is null)
            return null;

        var start = candidateStart.Value;
        var end = candidateEnd.Value;

        foreach (var sibling in otherSiblings)
        {
            if (sibling.PlannedStart is not { } siblingStart)
                continue;
            if (sibling.PlannedEnd is not { } siblingEnd)
                continue;

            if (start < siblingEnd && siblingStart < end)
                return sibling.Ordinal;
        }

        return null;
    }
}
