using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Api.Controllers.Plan;
using OneMoreTaskTracker.Api.Controllers.Plan.Feature.Stages;
using OneMoreTaskTracker.Proto.Features;
using OneMoreTaskTracker.Proto.Features.CreateFeatureCommand;
using OneMoreTaskTracker.Proto.Features.GetFeatureQuery;
using OneMoreTaskTracker.Proto.Features.ListFeaturesQuery;
using OneMoreTaskTracker.Proto.Features.PatchFeatureCommand;
using OneMoreTaskTracker.Proto.Users;
using ProtoFeatureStagePlan = OneMoreTaskTracker.Proto.Features.FeatureStagePlan;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature;

[ApiController]
[Authorize]
[Route("api/plan/features")]
public class FeaturesController(
    FeatureCreator.FeatureCreatorClient featureCreator,
    FeaturePatcher.FeaturePatcherClient featurePatcher,
    FeaturesLister.FeaturesListerClient featuresLister,
    FeatureGetter.FeatureGetterClient featureGetter,
    UserService.UserServiceClient userService,
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
                WindowStart = windowStart ?? string.Empty,
                WindowEnd = windowEnd ?? string.Empty,
            },
            cancellationToken: ct);

        var features = listResponse.Features.AsEnumerable();

        if (!string.IsNullOrEmpty(state))
            features = features.Where(f => f.State.ToWireString().Equals(state, StringComparison.OrdinalIgnoreCase));

        if (string.Equals(scope, "mine", StringComparison.OrdinalIgnoreCase))
            features = features.Where(f => f.LeadUserId == userId || f.ManagerUserId == userId);

        // tasksByFeature stays empty: TaskDto has no feature_id, so per-feature
        // task counts can't be computed from ListTasks. Calling Tasks/Users
        // here would only add an unused dependency.
        var summaries = features
            .Select(f => FeatureSummaryResponse.From(f, PlanRequestHelpers.EmptyTasks))
            .ToList();

        return Ok(summaries);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<FeatureDetailResponse>> Get(
        int id,
        CancellationToken ct)
    {
        var feature = await featureGetter.GetAsync(
            new GetFeatureRequest { Id = id },
            cancellationToken: ct);

        var roster = await userService.LoadRosterForManagerAsync(feature.ManagerUserId, logger, ct);

        var lead = MiniTeamMemberResponse.From(feature.LeadUserId, roster);
        var detailStagePlans = feature.StagePlans
            .Select(sp => BuildDetailStagePlan(sp, roster, feature.Id, feature.ManagerUserId))
            .ToList();

        var miniTeamIds = new HashSet<int>();
        if (feature.LeadUserId > 0) miniTeamIds.Add(feature.LeadUserId);
        foreach (var sp in feature.StagePlans)
            if (sp.PerformerUserId > 0) miniTeamIds.Add(sp.PerformerUserId);

        var miniTeam = miniTeamIds
            .Select(uid => MiniTeamMemberResponse.From(uid, roster))
            .ToList();

        var summary = FeatureSummaryResponse.From(feature, PlanRequestHelpers.EmptyTasks);

        return Ok(new FeatureDetailResponse(summary, [], lead, miniTeam, detailStagePlans));
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

        if (body.LeadUserId is { } leadUserId)
        {
            if (leadUserId < 1)
                return BadRequest(new { error = PlanRequestHelpers.InvalidRequest });

            var roster = await userService.LoadRosterForManagerAsync(callerUserId, logger, ct);
            if (!roster.ContainsKey(leadUserId))
                return BadRequest(new { error = "Pick a teammate from the list" });
        }

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

    private StagePlanDetailResponse BuildDetailStagePlan(
        ProtoFeatureStagePlan sp,
        IReadOnlyDictionary<int, TeamRosterMember> roster,
        int featureId,
        int managerUserId)
    {
        var performerUserId = sp.PerformerUserId > 0 ? (int?)sp.PerformerUserId : null;
        var performer = ResolvePerformer(performerUserId, roster, featureId, managerUserId, sp.Stage);

        return new StagePlanDetailResponse(
            sp.Stage.ToWireString(),
            string.IsNullOrEmpty(sp.PlannedStart) ? null : sp.PlannedStart,
            string.IsNullOrEmpty(sp.PlannedEnd) ? null : sp.PlannedEnd,
            performerUserId,
            performer,
            sp.Version);
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
