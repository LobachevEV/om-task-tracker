using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Api.Controllers.Plan.Feature.Stages;
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
    ILogger<FeaturesController> logger) : ControllerBase
{

    [HttpGet]
    public async Task<ActionResult<IEnumerable<FeatureSummaryResponse>>> List(
        [FromQuery] string? scope,
        [FromQuery] string? state,
        [FromQuery] string? windowStart,
        [FromQuery] string? windowEnd,
        CancellationToken ct)
    {
        if (!PlanRequestHelpers.TryValidateDateWindow(windowStart, windowEnd, out var windowError))
            return BadRequest(new { error = windowError });

        var userId = User.GetUserId();

        var listResponse = await featuresLister.ListAsync(
            new ListFeaturesRequest
            {
                ManagerUserId = userId,
                CallerUserId = userId,
                WindowStart = windowStart ?? string.Empty,
                WindowEnd = windowEnd ?? string.Empty,
                State = state ?? string.Empty,
                Scope = scope ?? string.Empty,
            },
            cancellationToken: ct);

        // Load roster once for the caller — used to resolve track/stage owners.
        // All features in the list share the same manager (userId = caller).
        var roster = await rosterProvider.LoadRosterAsync(userId, ct);

        var summaries = listResponse.Features
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
        var detailStagePlans = BuildDetailStagePlans(feature, roster);

        var miniTeamIds = new HashSet<int>();
        if (feature.LeadUserId > 0) miniTeamIds.Add(feature.LeadUserId);
        foreach (var sp in detailStagePlans)
            if (sp.PerformerUserId is > 0 and int pid) miniTeamIds.Add(pid);

        var miniTeam = miniTeamIds
            .Select(uid => MiniTeamMemberResponse.From(uid, roster))
            .ToList();

        var tracks = feature.Tracks
            .Select(t => FeatureTrackSummaryResponse.FromDetail(t, roster))
            .ToList();

        var summary = FeatureSummaryResponse.From(feature, PlanRequestHelpers.EmptyTasks, roster);

        return Ok(new FeatureDetailResponse(summary, [], lead, miniTeam, detailStagePlans, tracks));
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

        if (body.CsApprovingPlannedStart is not null)
            request.CsApprovingPlannedStart = body.CsApprovingPlannedStart;
        if (body.CsApprovingPlannedEnd is not null)
            request.CsApprovingPlannedEnd = body.CsApprovingPlannedEnd;
        if (body.CsApprovingOwnerUserId is { } csOwner)
            request.CsApprovingOwnerUserId = csOwner;

        if (body.DevelopmentPlannedStart is not null)
            request.DevelopmentPlannedStart = body.DevelopmentPlannedStart;
        if (body.DevelopmentPlannedEnd is not null)
            request.DevelopmentPlannedEnd = body.DevelopmentPlannedEnd;
        if (body.DevelopmentOwnerUserId is { } devOwner)
            request.DevelopmentOwnerUserId = devOwner;

        if (body.TestingPlannedStart is not null)
            request.TestingPlannedStart = body.TestingPlannedStart;
        if (body.TestingPlannedEnd is not null)
            request.TestingPlannedEnd = body.TestingPlannedEnd;
        if (body.TestingOwnerUserId is { } testOwner)
            request.TestingOwnerUserId = testOwner;

        if (body.EthalonTestingPlannedStart is not null)
            request.EthalonTestingPlannedStart = body.EthalonTestingPlannedStart;
        if (body.EthalonTestingPlannedEnd is not null)
            request.EthalonTestingPlannedEnd = body.EthalonTestingPlannedEnd;
        if (body.EthalonTestingOwnerUserId is { } etOwner)
            request.EthalonTestingOwnerUserId = etOwner;

        if (body.LiveReleasePlannedStart is not null)
            request.LiveReleasePlannedStart = body.LiveReleasePlannedStart;
        if (body.LiveReleasePlannedEnd is not null)
            request.LiveReleasePlannedEnd = body.LiveReleasePlannedEnd;
        if (body.LiveReleaseOwnerUserId is { } lrOwner)
            request.LiveReleaseOwnerUserId = lrOwner;

        if (expectedVersion.HasValue)
            request.ExpectedVersion = expectedVersion.Value;

        var dto = await featurePatcher.PatchAsync(request, cancellationToken: ct);
        return Ok(FeatureSummaryResponse.From(dto, PlanRequestHelpers.EmptyTasks));
    }

    private IReadOnlyList<StagePlanDetailResponse> BuildDetailStagePlans(
        GetFeatureQuery.FeatureDto feature,
        IReadOnlyDictionary<int, TeamRosterMember> roster)
    {
        var stages = new[]
        {
            (FeatureState.CsApproving,    feature.CsApprovingPlannedStart,    feature.CsApprovingPlannedEnd,    feature.CsApprovingOwnerUserId),
            (FeatureState.Development,    feature.DevelopmentPlannedStart,    feature.DevelopmentPlannedEnd,    feature.DevelopmentOwnerUserId),
            (FeatureState.Testing,        feature.TestingPlannedStart,        feature.TestingPlannedEnd,        feature.TestingOwnerUserId),
            (FeatureState.EthalonTesting, feature.EthalonTestingPlannedStart, feature.EthalonTestingPlannedEnd, feature.EthalonTestingOwnerUserId),
            (FeatureState.LiveRelease,    feature.LiveReleasePlannedStart,    feature.LiveReleasePlannedEnd,    feature.LiveReleaseOwnerUserId),
        };

        return stages.Select(s =>
        {
            var (stageState, plannedStart, plannedEnd, ownerUserId) = s;
            var performerUserId = ownerUserId > 0 ? (int?)ownerUserId : null;
            var performer = ResolvePerformer(performerUserId, roster, feature.Id, feature.ManagerUserId, stageState);
            return new StagePlanDetailResponse(
                stageState.ToWireString(),
                string.IsNullOrEmpty(plannedStart) ? null : plannedStart,
                string.IsNullOrEmpty(plannedEnd) ? null : plannedEnd,
                performerUserId,
                performer,
                feature.Version);
        }).ToList();
    }

    private MiniTeamMemberResponse? ResolvePerformer(
        int? performerUserId,
        IReadOnlyDictionary<int, TeamRosterMember> roster,
        int featureId,
        int managerUserId,
        FeatureState stage)
    {
        if (performerUserId is not int pid)
            return null;

        if (roster.TryGetValue(pid, out var member))
            return new MiniTeamMemberResponse(
                member.UserId,
                member.Email,
                DisplayNameHelper.ExtractDisplayName(member.Email),
                member.Role);

        // Stale id: emit performer:null (not a placeholder); id stays on the wire.
        logger.LogWarning(
            "Stage performer {PerformerUserId} not on manager {ManagerUserId}'s roster (feature {FeatureId}, stage {Stage})",
            pid,
            managerUserId,
            featureId,
            stage);
        return null;
    }
}
