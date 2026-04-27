using OneMoreTaskTracker.Proto.Features.CreateFeatureCommand;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature;

internal static class CreateFeatureRequestFactory
{
    public static CreateFeatureRequest From(CreateFeaturePayload body, int managerUserId)
    {
        var leadUserId = body.LeadUserId.GetValueOrDefault() > 0
            ? body.LeadUserId!.Value
            : managerUserId;

        return new CreateFeatureRequest
        {
            Title         = body.Title,
            Description   = body.Description ?? string.Empty,
            LeadUserId    = leadUserId,
            ManagerUserId = managerUserId,
            PlannedStart  = body.PlannedStart ?? string.Empty,
            PlannedEnd    = body.PlannedEnd   ?? string.Empty,
        };
    }
}
