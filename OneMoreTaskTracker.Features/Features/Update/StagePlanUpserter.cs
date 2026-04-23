using OneMoreTaskTracker.Features.Features.Data;

namespace OneMoreTaskTracker.Features.Features.Update;

// Pure, stateless helper used by UpdateFeatureHandler to apply the inbound
// stage-plan list to the owning feature's navigation collection and recompute
// the derived Feature.PlannedStart / PlannedEnd from the populated rows.
//
// This lives next to the handler rather than in a "service layer" because the
// Features service is deliberately handler-per-use-case. Keeping the math
// here keeps the handler body short and makes unit testing trivial.
internal static class StagePlanUpserter
{
    // Upsert the 5 stage-plan rows onto the feature's navigation collection.
    // Existing rows (matched by Stage) are updated in-place to preserve their
    // identity and CreatedAt; missing rows are inserted. The input has already
    // been validated (count == 5, unique stages, per-row date order) by
    // FeatureValidation.ValidateStagePlans.
    public static void ApplyStagePlans(
        Feature feature,
        IReadOnlyList<StagePlanInput> inputs,
        DateTime now)
    {
        foreach (var input in inputs)
        {
            var stageOrdinal = (int)input.Stage;
            var existing = feature.StagePlans.FirstOrDefault(sp => sp.Stage == stageOrdinal);

            if (existing is null)
            {
                feature.StagePlans.Add(new FeatureStagePlan
                {
                    FeatureId       = feature.Id,
                    Stage           = stageOrdinal,
                    PlannedStart    = input.PlannedStart,
                    PlannedEnd      = input.PlannedEnd,
                    PerformerUserId = NormalizePerformer(input.PerformerUserId),
                    CreatedAt       = now,
                    UpdatedAt       = now,
                });
            }
            else
            {
                existing.PlannedStart    = input.PlannedStart;
                existing.PlannedEnd      = input.PlannedEnd;
                existing.PerformerUserId = NormalizePerformer(input.PerformerUserId);
                existing.UpdatedAt       = now;
            }
        }
    }

    // Derived-date recomputation: PlannedStart = min(non-null starts),
    // PlannedEnd = max(non-null ends). Both null when no stage has a date.
    // Caller should invoke AFTER ApplyStagePlans so the navigation collection
    // reflects the pending writes.
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

    // proto3 scalar default of 0 = unassigned. Negative ids are coerced to 0
    // defensively; the REST layer does the same coercion in the other direction.
    private static int NormalizePerformer(int raw) => raw > 0 ? raw : 0;
}
