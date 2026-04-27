using OneMoreTaskTracker.Proto.Features.UpdateFeatureCommand;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature;

internal static class UpdateFeatureRequestFactory
{
    public static UpdateFeatureRequest From(int id, UpdateFeaturePayload body, int callerUserId) => new()
    {
        Id            = id,
        Title         = body.Title         ?? string.Empty,
        Description   = body.Description   ?? string.Empty,
        PlannedStart  = body.PlannedStart  ?? string.Empty,
        PlannedEnd    = body.PlannedEnd    ?? string.Empty,
        LeadUserId    = body.LeadUserId.GetValueOrDefault(),
        State         = PlanMapper.ParseState(body.State),
        CallerUserId  = callerUserId,
    };
}
