using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Api.Controllers.Plan.Feature.Tracks;
using OneMoreTaskTracker.Api.Roster;
using OneMoreTaskTracker.Proto.Features;
using OneMoreTaskTracker.Proto.Features.CreateFeatureCommand;
using GetFeatureQuery = OneMoreTaskTracker.Proto.Features.GetFeatureQuery;
using OneMoreTaskTracker.Proto.Features.ListFeaturesQuery;
using OneMoreTaskTracker.Proto.Features.PatchFeatureCommand;
using OneMoreTaskTracker.Proto.Users;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature;

[ApiController]
[Authorize]
[Route("api/plan/features")]
public class FeaturesController(
    FeatureCreator.FeatureCreatorClient featureCreator,
    FeaturePatcher.FeaturePatcherClient featurePatcher,
    FeaturesLister.FeaturesListerClient featuresLister,
    GetFeatureQuery.FeatureGetter.FeatureGetterClient featureGetter,
    ITeamRosterProvider rosterProvider,
    IValidator<UpdateFeaturePayload> updateValidator,
    IValidator<ListFeaturesQueryModel> listQueryValidator,
    ILogger<FeaturesController> logger) : ControllerBase
{

    [HttpGet]
    public async Task<ActionResult<IEnumerable<FeatureSummaryResponse>>> List(
        [FromQuery] ListFeaturesQueryModel query,
        CancellationToken ct)
    {
        var scopeValidation = await listQueryValidator.ValidateAsync(query, ct);
        if (!scopeValidation.IsValid)
            return BadRequest(new { error = scopeValidation.Errors[0].ErrorMessage });

        if (!PlanRequestHelpers.TryValidateDateWindow(query.WindowStart, query.WindowEnd, out var windowError))
            return BadRequest(new { error = windowError });

        var userId = User.GetUserId();

        var listResponse = await featuresLister.ListAsync(
            new ListFeaturesRequest
            {
                ManagerUserId = userId,
                WindowStart = query.WindowStart ?? string.Empty,
                WindowEnd = query.WindowEnd ?? string.Empty,
                State = query.State ?? string.Empty,
            },
            cancellationToken: ct);

        var roster = await rosterProvider.LoadRosterAsync(userId, ct);

        ListScopeParser.TryParse(query.Scope, out var scope);
        var features = scope == ListScopeKind.Mine
            ? listResponse.Features.Where(f => f.LeadUserId == userId)
            : listResponse.Features;

        var summaries = features
            .Select(f => FeatureSummaryResponse.From(f, PlanRequestHelpers.EmptyTasks, roster))
            .ToList();

        return Ok(summaries);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<FeatureDetailResponse>> Get(
        int id,
        CancellationToken ct)
    {
        var feature = await featureGetter.GetAsync(
            new GetFeatureQuery.GetFeatureRequest { Id = id },
            cancellationToken: ct);

        var roster = await rosterProvider.LoadRosterAsync(feature.ManagerUserId, ct);

        var lead = MiniTeamMemberResponse.From(feature.LeadUserId, roster);

        var miniTeamIds = new HashSet<int>();
        if (feature.LeadUserId > 0) miniTeamIds.Add(feature.LeadUserId);
        foreach (var track in feature.Tracks)
        {
            if (track.TrackOwnerUserId > 0) miniTeamIds.Add(track.TrackOwnerUserId);
        }

        var miniTeam = miniTeamIds
            .Select(uid => MiniTeamMemberResponse.From(uid, roster))
            .ToList();

        var tracks = feature.Tracks
            .Select(t => FeatureTrackSummaryResponse.FromDetail(t, roster))
            .ToList();

        var summary = FeatureSummaryResponse.From(feature, PlanRequestHelpers.EmptyTasks, roster);

        return Ok(new FeatureDetailResponse(summary, [], lead, miniTeam, tracks));
    }

    [HttpPost]
    [Authorize(Roles = Roles.Manager)]
    public async Task<ActionResult<FeatureSummaryResponse>> Create(
        [FromBody] CreateFeaturePayload body,
        CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var request = CreateFeatureRequestFactory.From(body, User.GetUserId());

        var created = await featureCreator.CreateAsync(request, cancellationToken: ct);
        return Ok(FeatureSummaryResponse.From(created, PlanRequestHelpers.EmptyTasks));
    }

    [HttpPatch("{id:int}")]
    [Authorize(Roles = Roles.Manager)]
    public async Task<ActionResult<FeatureSummaryResponse>> Update(
        int id,
        [FromBody] UpdateFeaturePayload body,
        [FromHeader(Name = "If-Match")] string? ifMatch,
        CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var callerUserId = User.GetUserId();
        var validationContext = new ValidationContext<UpdateFeaturePayload>(body);
        validationContext.SetCallerUserId(callerUserId);
        var validation = await updateValidator.ValidateAsync(validationContext, ct);
        if (!validation.IsValid)
            return BadRequest(new { error = validation.Errors[0].ErrorMessage });

        var headerVersion = PlanRequestHelpers.ParseIfMatch(ifMatch, logger);
        var expectedVersion = body.ExpectedVersion ?? headerVersion;

        var request = new PatchFeatureRequest
        {
            Id = id,
            CallerUserId = callerUserId,
        };

        if (body.Title is not null)
            request.Title = body.Title;

        if (body.Description is not null)
            request.Description = body.Description;

        if (body.LeadUserId is { } lead)
            request.LeadUserId = lead;

        if (expectedVersion.HasValue)
            request.ExpectedVersion = expectedVersion.Value;

        var dto = await featurePatcher.PatchAsync(request, cancellationToken: ct);
        return Ok(FeatureSummaryResponse.From(dto, PlanRequestHelpers.EmptyTasks));
    }
}
