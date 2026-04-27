using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Api.Controllers.Plan;
using OneMoreTaskTracker.Api.Controllers.Plan.Feature.Stages;
using OneMoreTaskTracker.Proto.Features;
using OneMoreTaskTracker.Proto.Features.CreateFeatureCommand;
using OneMoreTaskTracker.Proto.Features.GetFeatureQuery;
using OneMoreTaskTracker.Proto.Features.ListFeaturesQuery;
using OneMoreTaskTracker.Proto.Features.UpdateFeatureCommand;
using OneMoreTaskTracker.Proto.Users;
using ProtoFeatureStagePlan = OneMoreTaskTracker.Proto.Features.FeatureStagePlan;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature;

[ApiController]
[Authorize]
[Route("api/plan/features")]
public class FeaturesController(
    FeatureCreator.FeatureCreatorClient featureCreator,
    FeatureUpdater.FeatureUpdaterClient featureUpdater,
    FeaturesLister.FeaturesListerClient featuresLister,
    FeatureGetter.FeatureGetterClient featureGetter,
    UserService.UserServiceClient userService,
    ILogger<FeaturesController> logger) : ControllerBase
{
    private const int ExpectedStageCount = 5;

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
            features = features.Where(f => PlanMapper.MapState(f.State, logger).Equals(state, StringComparison.OrdinalIgnoreCase));

        if (string.Equals(scope, "mine", StringComparison.OrdinalIgnoreCase))
            features = features.Where(f => f.LeadUserId == userId || f.ManagerUserId == userId);

        // tasksByFeature stays empty: TaskDto has no feature_id, so per-feature
        // task counts can't be computed from ListTasks. Calling Tasks/Users
        // here would only add an unused dependency.
        var summaries = features
            .Select(f => PlanMapper.MapSummary(f, PlanRequestHelpers.EmptyTasks, logger))
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

        var lead = PlanMapper.BuildMiniTeamMember(feature.LeadUserId, roster);
        var detailStagePlans = feature.StagePlans
            .Select(sp => BuildDetailStagePlan(sp, roster, feature.Id, feature.ManagerUserId))
            .ToList();

        var miniTeamIds = new HashSet<int>();
        if (feature.LeadUserId > 0) miniTeamIds.Add(feature.LeadUserId);
        foreach (var sp in feature.StagePlans)
            if (sp.PerformerUserId > 0) miniTeamIds.Add(sp.PerformerUserId);

        var miniTeam = miniTeamIds
            .Select(uid => PlanMapper.BuildMiniTeamMember(uid, roster))
            .ToList();

        var summary = PlanMapper.MapSummary(feature, PlanRequestHelpers.EmptyTasks, logger);

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
        return Ok(PlanMapper.MapSummary(created, PlanRequestHelpers.EmptyTasks, logger));
    }

    [HttpPatch("{id:int}")]
    [Authorize(Roles = Roles.Manager)]
    public async Task<ActionResult<FeatureSummaryResponse>> Update(
        int id,
        [FromBody] UpdateFeaturePayload body,
        CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var request = UpdateFeatureRequestFactory.From(id, body, User.GetUserId());

        if (TryAppendStagePlans(request, body.StagePlans) is { } stageError)
            return stageError;

        var updated = await featureUpdater.UpdateAsync(request, cancellationToken: ct);
        return Ok(PlanMapper.MapSummary(updated, PlanRequestHelpers.EmptyTasks, logger));
    }

    private ActionResult? TryAppendStagePlans(
        UpdateFeatureRequest request,
        IReadOnlyList<Stages.StagePlanPayload>? stagePlans)
    {
        if (stagePlans is null)
            return null;

        if (stagePlans.Count != ExpectedStageCount)
            return BadRequest(new { error = PlanRequestHelpers.InvalidRequest });

        var seenStages = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var sp in stagePlans)
        {
            if (string.IsNullOrEmpty(sp.Stage) || !PlanMapper.TryParseStage(sp.Stage, out var protoStage) || !seenStages.Add(sp.Stage))
                return BadRequest(new { error = PlanRequestHelpers.InvalidRequest });

            request.StagePlans.Add(new ProtoFeatureStagePlan
            {
                Stage           = protoStage,
                PlannedStart    = sp.PlannedStart ?? string.Empty,
                PlannedEnd      = sp.PlannedEnd   ?? string.Empty,
                PerformerUserId = sp.PerformerUserId is { } p and > 0 ? p : 0,
            });
        }

        return null;
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
            PlanMapper.MapState(sp.Stage, logger),
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
                PlanMapper.ExtractDisplayName(member.Email),
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
