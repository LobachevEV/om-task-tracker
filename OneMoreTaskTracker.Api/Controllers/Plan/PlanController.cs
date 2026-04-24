using System.Globalization;
using Grpc.Core;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Proto.Features;
using OneMoreTaskTracker.Proto.Features.CreateFeatureCommand;
using OneMoreTaskTracker.Proto.Features.GetFeatureQuery;
using OneMoreTaskTracker.Proto.Features.ListFeaturesQuery;
using OneMoreTaskTracker.Proto.Features.UpdateFeatureCommand;
using OneMoreTaskTracker.Proto.Features.UpdateFeatureDescriptionCommand;
using OneMoreTaskTracker.Proto.Features.UpdateFeatureTitleCommand;
using OneMoreTaskTracker.Proto.Features.UpdateStageOwnerCommand;
using OneMoreTaskTracker.Proto.Features.UpdateStagePlannedEndCommand;
using OneMoreTaskTracker.Proto.Features.UpdateStagePlannedStartCommand;
using OneMoreTaskTracker.Proto.Tasks;
using OneMoreTaskTracker.Proto.Tasks.AttachTaskCommand;
using OneMoreTaskTracker.Proto.Tasks.ListTasksQuery;
using OneMoreTaskTracker.Proto.Users;
using ProtoFeatureStagePlan = OneMoreTaskTracker.Proto.Features.FeatureStagePlan;

namespace OneMoreTaskTracker.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/plan")]
public class PlanController(
    FeatureCreator.FeatureCreatorClient featureCreator,
    FeatureUpdater.FeatureUpdaterClient featureUpdater,
    FeaturesLister.FeaturesListerClient featuresLister,
    FeatureGetter.FeatureGetterClient featureGetter,
    FeatureTitleUpdater.FeatureTitleUpdaterClient featureTitleUpdater,
    FeatureDescriptionUpdater.FeatureDescriptionUpdaterClient featureDescriptionUpdater,
    StageOwnerUpdater.StageOwnerUpdaterClient stageOwnerUpdater,
    StagePlannedStartUpdater.StagePlannedStartUpdaterClient stagePlannedStartUpdater,
    StagePlannedEndUpdater.StagePlannedEndUpdaterClient stagePlannedEndUpdater,
    TaskFeatureLinker.TaskFeatureLinkerClient taskFeatureLinker,
    TaskLister.TaskListerClient taskLister,
    UserService.UserServiceClient userService,
    ILogger<PlanController> logger) : ControllerBase
{
    // Canonical set of stage names accepted on the wire; exposed here and in
    // the openapi.json so FE + evaluator share the same vocabulary.
    private const int ExpectedStageCount = 5;

    [HttpGet("features")]
    public async Task<ActionResult<IEnumerable<FeatureSummaryResponse>>> ListFeatures(
        [FromQuery] string? scope,
        [FromQuery] string? state,
        CancellationToken ct)
    {
        var userId = User.GetUserId();
        var role = User.GetRole();

        var listResponse = await featuresLister.ListAsync(
            new ListFeaturesRequest { ManagerUserId = userId },
            cancellationToken: ct);

        var features = listResponse.Features.AsEnumerable();

        if (!string.IsNullOrEmpty(state))
            features = features.Where(f => PlanMapper.MapState(f.State, logger).Equals(state, StringComparison.OrdinalIgnoreCase));

        if (string.Equals(scope, "mine", StringComparison.OrdinalIgnoreCase))
            features = features.Where(f => f.LeadUserId == userId || f.ManagerUserId == userId);

        var featureList = features.ToList();

        var teamMemberIds = role == Roles.Manager
            ? await GetTeamMemberIds(userId, ct)
            : Array.Empty<int>();

        var tasksResponse = await taskLister.ListTasksAsync(new ListTasksRequest
        {
            UserId = userId,
            Role = role,
            TeamMemberIds = { teamMemberIds }
        }, cancellationToken: ct);

        // TaskDto in ListTasksResponse does not expose FeatureId (spec 07 §112 —
        // filter in-memory after listing). Until a feature_id field is added to
        // list_tasks_query_handler.proto, per-feature taskCount/taskIds cannot
        // be computed from the lister. Counts remain 0 and ids empty.
        var tasksByFeature = new Dictionary<int, List<int>>();
        _ = tasksResponse;

        var summaries = featureList
            .Select(f => PlanMapper.MapSummary(f, tasksByFeature, logger))
            .ToList();

        return Ok(summaries);
    }

    [HttpGet("features/{id:int}")]
    public async Task<ActionResult<FeatureDetailResponse>> GetFeature(
        int id,
        CancellationToken ct)
    {
        var userId = User.GetUserId();
        var role = User.GetRole();

        var feature = await featureGetter.GetAsync(
            new GetFeatureRequest { Id = id },
            cancellationToken: ct);

        var teamMemberIds = role == Roles.Manager
            ? await GetTeamMemberIds(userId, ct)
            : Array.Empty<int>();

        var tasksResponse = await taskLister.ListTasksAsync(new ListTasksRequest
        {
            UserId = userId,
            Role = role,
            TeamMemberIds = { teamMemberIds }
        }, cancellationToken: ct);

        // See note in ListFeatures: TaskDto lacks FeatureId, so server-side
        // filtering by FeatureId is not possible via the current ListTasks
        // contract. All team-visible tasks are returned until the proto grows
        // a feature_id field. Empty list is produced here to honor the
        // AttachedTaskResponse shape without fabricating assignments.
        _ = tasksResponse;
        var attachedTasks = new List<AttachedTaskResponse>();

        // Load the feature manager's roster once — both the lead and every
        // stage-plan performer resolve against the same dictionary.
        var roster = await LoadRosterForManager(feature.ManagerUserId, ct);

        var lead = PlanMapper.BuildMiniTeamMember(feature.LeadUserId, roster);
        var detailStagePlans = feature.StagePlans
            .Select(sp => BuildDetailStagePlan(sp, roster, feature.Id, feature.ManagerUserId))
            .ToList();

        // miniTeam is the deduped union of: attached-task assignees, the lead,
        // and every populated stage-plan performer. Stale ids fall back to the
        // same placeholder member used for stale leads (keeps FE rendering deterministic).
        var miniTeamIds = new HashSet<int>();
        foreach (var taskAssignee in attachedTasks)
            if (taskAssignee.UserId > 0) miniTeamIds.Add(taskAssignee.UserId);
        if (feature.LeadUserId > 0) miniTeamIds.Add(feature.LeadUserId);
        foreach (var sp in feature.StagePlans)
            if (sp.PerformerUserId > 0) miniTeamIds.Add(sp.PerformerUserId);

        var miniTeam = miniTeamIds
            .Select(uid => PlanMapper.BuildMiniTeamMember(uid, roster))
            .ToList();

        var summary = PlanMapper.MapSummary(feature, new Dictionary<int, List<int>>(), logger);

        return Ok(new FeatureDetailResponse(summary, attachedTasks, lead, miniTeam, detailStagePlans));
    }

    [HttpPost("features")]
    [Authorize(Roles = Roles.Manager)]
    public async Task<ActionResult<FeatureSummaryResponse>> CreateFeature(
        [FromBody] CreateFeaturePayload body,
        CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var managerUserId = User.GetUserId();
        var leadUserId = body.LeadUserId.GetValueOrDefault() > 0
            ? body.LeadUserId!.Value
            : managerUserId;

        var request = new CreateFeatureRequest
        {
            Title = body.Title,
            Description = body.Description ?? string.Empty,
            LeadUserId = leadUserId,
            ManagerUserId = managerUserId,
            PlannedStart = body.PlannedStart ?? string.Empty,
            PlannedEnd = body.PlannedEnd ?? string.Empty
        };

        var created = await featureCreator.CreateAsync(request, cancellationToken: ct);
        return Ok(PlanMapper.MapSummary(created, new Dictionary<int, List<int>>(), logger));
    }

    [HttpPatch("features/{id:int}")]
    [Authorize(Roles = Roles.Manager)]
    public async Task<ActionResult<FeatureSummaryResponse>> UpdateFeature(
        int id,
        [FromBody] UpdateFeaturePayload body,
        CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var callerUserId = User.GetUserId();

        var request = new UpdateFeatureRequest
        {
            Id = id,
            Title = body.Title ?? string.Empty,
            Description = body.Description ?? string.Empty,
            PlannedStart = body.PlannedStart ?? string.Empty,
            PlannedEnd = body.PlannedEnd ?? string.Empty,
            LeadUserId = body.LeadUserId.GetValueOrDefault(),
            State = PlanMapper.ParseState(body.State),
            // Propagate the authenticated caller id so the Features service can
            // re-verify feature ownership (double-defense; see
            // ~/.claude/rules/microservices/security.md).
            CallerUserId = callerUserId,
        };

        // Stage plan boundary validation lives here — omitted means "do not
        // touch" (nothing added to request.StagePlans). Non-null MUST have
        // exactly 5 entries with unique recognised stage names, matching
        // api-contract.md "Partial update semantics".
        if (body.StagePlans is not null)
        {
            if (body.StagePlans.Count != ExpectedStageCount)
                return BadRequest(new { error = "Invalid request data" });

            var seenStages = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var sp in body.StagePlans)
            {
                if (string.IsNullOrEmpty(sp.Stage) || !PlanMapper.TryParseStage(sp.Stage, out var protoStage) || !seenStages.Add(sp.Stage))
                    return BadRequest(new { error = "Invalid request data" });

                request.StagePlans.Add(new ProtoFeatureStagePlan
                {
                    Stage           = protoStage,
                    PlannedStart    = sp.PlannedStart ?? string.Empty,
                    PlannedEnd      = sp.PlannedEnd   ?? string.Empty,
                    // performer_user_id on the wire = 0 means "unassigned"; we
                    // coerce negative / zero inputs to 0 defensively.
                    PerformerUserId = sp.PerformerUserId is { } p and > 0 ? p : 0,
                });
            }
        }

        var updated = await featureUpdater.UpdateAsync(request, cancellationToken: ct);
        return Ok(PlanMapper.MapSummary(updated, new Dictionary<int, List<int>>(), logger));
    }

    // ----- Inline-edit per-field PATCH endpoints (gantt-inline-edit feature) -----
    // Each endpoint returns the refreshed FeatureSummary so the FE reconciles
    // derived fields (plannedStart/plannedEnd/state/version) in one round trip.
    // `If-Match: <version>` is optional in iter 1 and forwarded to the Features
    // service as `expected_version` / `expected_stage_version`.

    [HttpPatch("features/{id:int}/title")]
    [Authorize(Roles = Roles.Manager)]
    public async Task<ActionResult<FeatureSummaryResponse>> UpdateFeatureTitle(
        int id,
        [FromBody] UpdateFeatureTitlePayload body,
        [FromHeader(Name = "If-Match")] string? ifMatch,
        CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(new { error = "Invalid request data" });
        if (string.IsNullOrWhiteSpace(body.Title))
            return BadRequest(new { error = "Invalid request data" });

        var callerUserId = User.GetUserId();
        var expectedVersion = ParseIfMatch(ifMatch);

        var dto = await featureTitleUpdater.UpdateAsync(new UpdateFeatureTitleRequest
        {
            Id = id,
            Title = body.Title,
            CallerUserId = callerUserId,
            ExpectedVersion = expectedVersion,
        }, cancellationToken: ct);

        return Ok(PlanMapper.MapSummary(dto, EmptyTasks, logger));
    }

    [HttpPatch("features/{id:int}/description")]
    [Authorize(Roles = Roles.Manager)]
    public async Task<ActionResult<FeatureSummaryResponse>> UpdateFeatureDescription(
        int id,
        [FromBody] UpdateFeatureDescriptionPayload body,
        [FromHeader(Name = "If-Match")] string? ifMatch,
        CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(new { error = "Invalid request data" });

        var callerUserId = User.GetUserId();
        var expectedVersion = ParseIfMatch(ifMatch);

        var dto = await featureDescriptionUpdater.UpdateAsync(new UpdateFeatureDescriptionRequest
        {
            Id = id,
            // Wire convention: "" == null (matches feature.Description nullable).
            Description = body.Description ?? string.Empty,
            CallerUserId = callerUserId,
            ExpectedVersion = expectedVersion,
        }, cancellationToken: ct);

        return Ok(PlanMapper.MapSummary(dto, EmptyTasks, logger));
    }

    [HttpPatch("features/{id:int}/stages/{stage}/owner")]
    [Authorize(Roles = Roles.Manager)]
    public async Task<ActionResult<FeatureSummaryResponse>> UpdateStageOwner(
        int id,
        string stage,
        [FromBody] UpdateStageOwnerPayload body,
        [FromHeader(Name = "If-Match")] string? ifMatch,
        CancellationToken ct)
    {
        if (!PlanMapper.TryParseStage(stage, out var parsedStage))
            return BadRequest(new { error = "Invalid request data" });

        // Reject unparseable owner ids; null clears, positive ids must be on
        // the manager's roster (gateway-side roster validation per
        // microservices/composition.md). Iter 1 accepts the id opaquely — full
        // roster membership enforcement is Phase B (see backend-plan.md).
        if (body.StageOwnerUserId is { } ownerId && ownerId < 1)
            return BadRequest(new { error = "Invalid request data" });

        var callerUserId = User.GetUserId();
        var expectedStageVersion = ParseIfMatch(ifMatch);

        var dto = await stageOwnerUpdater.UpdateAsync(new UpdateStageOwnerRequest
        {
            FeatureId = id,
            Stage = parsedStage,
            // proto3 default 0 on the wire = unassigned.
            StageOwnerUserId = body.StageOwnerUserId ?? 0,
            CallerUserId = callerUserId,
            ExpectedStageVersion = expectedStageVersion,
        }, cancellationToken: ct);

        return Ok(PlanMapper.MapSummary(dto, EmptyTasks, logger));
    }

    [HttpPatch("features/{id:int}/stages/{stage}/planned-start")]
    [Authorize(Roles = Roles.Manager)]
    public async Task<ActionResult<FeatureSummaryResponse>> UpdateStagePlannedStart(
        int id,
        string stage,
        [FromBody] UpdateStagePlannedStartPayload body,
        [FromHeader(Name = "If-Match")] string? ifMatch,
        CancellationToken ct)
    {
        if (!PlanMapper.TryParseStage(stage, out var parsedStage))
            return BadRequest(new { error = "Invalid request data" });

        var callerUserId = User.GetUserId();
        var expectedStageVersion = ParseIfMatch(ifMatch);

        var dto = await stagePlannedStartUpdater.UpdateAsync(new UpdateStagePlannedStartRequest
        {
            FeatureId = id,
            Stage = parsedStage,
            PlannedStart = body.PlannedStart ?? string.Empty,
            CallerUserId = callerUserId,
            ExpectedStageVersion = expectedStageVersion,
        }, cancellationToken: ct);

        return Ok(PlanMapper.MapSummary(dto, EmptyTasks, logger));
    }

    [HttpPatch("features/{id:int}/stages/{stage}/planned-end")]
    [Authorize(Roles = Roles.Manager)]
    public async Task<ActionResult<FeatureSummaryResponse>> UpdateStagePlannedEnd(
        int id,
        string stage,
        [FromBody] UpdateStagePlannedEndPayload body,
        [FromHeader(Name = "If-Match")] string? ifMatch,
        CancellationToken ct)
    {
        if (!PlanMapper.TryParseStage(stage, out var parsedStage))
            return BadRequest(new { error = "Invalid request data" });

        var callerUserId = User.GetUserId();
        var expectedStageVersion = ParseIfMatch(ifMatch);

        var dto = await stagePlannedEndUpdater.UpdateAsync(new UpdateStagePlannedEndRequest
        {
            FeatureId = id,
            Stage = parsedStage,
            PlannedEnd = body.PlannedEnd ?? string.Empty,
            CallerUserId = callerUserId,
            ExpectedStageVersion = expectedStageVersion,
        }, cancellationToken: ct);

        return Ok(PlanMapper.MapSummary(dto, EmptyTasks, logger));
    }

    [HttpPost("features/{id:int}/tasks/{jiraId}")]
    [Authorize(Roles = Roles.Manager)]
    public async Task<ActionResult<FeatureSummaryResponse>> AttachTask(
        int id,
        string jiraId,
        CancellationToken ct)
    {
        // Verify the feature exists before asking the Tasks service to attach;
        // the Tasks DB has no FK constraint across schemas, so the gateway
        // enforces the invariant. NotFound bubbles up through the middleware.
        var feature = await featureGetter.GetAsync(
            new GetFeatureRequest { Id = id },
            cancellationToken: ct);

        await taskFeatureLinker.AttachAsync(
            new AttachTaskToFeatureRequest { JiraTaskId = jiraId, FeatureId = id },
            cancellationToken: ct);

        return Ok(PlanMapper.MapSummary(feature, new Dictionary<int, List<int>>(), logger));
    }

    [HttpDelete("features/{id:int}/tasks/{jiraId}")]
    [Authorize(Roles = Roles.Manager)]
    public async Task<ActionResult<FeatureSummaryResponse>> DetachTask(
        int id,
        string jiraId,
        [FromBody] DetachTaskBody? body,
        CancellationToken ct)
    {
        if (body is null || body.ReassignToFeatureId <= 0)
            return UnprocessableEntity(new { error = "reassignToFeatureId is required" });

        await taskFeatureLinker.DetachAsync(
            new DetachTaskFromFeatureRequest
            {
                JiraTaskId = jiraId,
                ReassignToFeatureId = body.ReassignToFeatureId
            }, cancellationToken: ct);

        var feature = await featureGetter.GetAsync(
            new GetFeatureRequest { Id = id },
            cancellationToken: ct);

        return Ok(PlanMapper.MapSummary(feature, new Dictionary<int, List<int>>(), logger));
    }

    // Inline-edit responses do not compose per-feature task lists (the Gantt
    // row keeps its current taskCount / taskIds from the last list/detail
    // fetch). Returning an empty map here is safe: MapSummary looks up by
    // feature id and falls back to an empty array when missing.
    private static readonly IReadOnlyDictionary<int, List<int>> EmptyTasks =
        new Dictionary<int, List<int>>();

    // If-Match header parser for the inline-edit endpoints. Iter 1 treats the
    // header as optional — missing or unparseable values pass 0 sentinel to
    // the Features service, which falls back to last-write-wins and logs.
    private int ParseIfMatch(string? ifMatch)
    {
        if (string.IsNullOrWhiteSpace(ifMatch))
            return 0;

        // Strip optional surrounding quotes per the RFC 7232 weak/strong ETag
        // convention; clients that send `If-Match: "7"` and `If-Match: 7`
        // should produce identical server behavior.
        var trimmed = ifMatch.Trim().Trim('"');
        if (int.TryParse(trimmed, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed) && parsed >= 0)
            return parsed;

        logger.LogWarning("Could not parse If-Match header value '{IfMatch}'; proceeding in advisory mode", ifMatch);
        return 0;
    }

    private async Task<IEnumerable<int>> GetTeamMemberIds(int userId, CancellationToken ct)
    {
        var teamResponse = await userService.GetTeamMemberIdsAsync(
            new GetTeamMemberIdsRequest { ManagerId = userId },
            cancellationToken: ct);

        return teamResponse.UserIds.Append(userId);
    }

    private async Task<IReadOnlyDictionary<int, TeamRosterMember>> LoadRosterForManager(
        int managerId,
        CancellationToken ct)
    {
        if (managerId <= 0)
            return new Dictionary<int, TeamRosterMember>();

        try
        {
            var roster = await userService.GetTeamRosterAsync(
                new GetTeamRosterRequest { ManagerId = managerId },
                cancellationToken: ct);
            return roster.Members.ToDictionary(m => m.UserId);
        }
        catch (RpcException ex)
        {
            logger.LogWarning(ex, "Failed to load roster for manager {ManagerId}", managerId);
            return new Dictionary<int, TeamRosterMember>();
        }
    }

    private StagePlanDetailResponse BuildDetailStagePlan(
        ProtoFeatureStagePlan sp,
        IReadOnlyDictionary<int, TeamRosterMember> roster,
        int featureId,
        int managerUserId)
    {
        var performerUserId = sp.PerformerUserId > 0 ? (int?)sp.PerformerUserId : null;
        MiniTeamMemberResponse? performer = null;

        if (performerUserId is int pid)
        {
            if (roster.TryGetValue(pid, out var member))
            {
                performer = new MiniTeamMemberResponse(
                    member.UserId,
                    member.Email,
                    PlanMapper.ExtractDisplayName(member.Email),
                    member.Role);
            }
            else
            {
                // Stale ids: the id stays on the wire (`performerUserId`) so the
                // FE can still render the "Performer no longer on team" state,
                // but we deliberately emit `performer: null` rather than an
                // empty-string placeholder object. The FE's Zod schema requires
                // `email.email()` and `displayName.min(1)`; an empty-string
                // placeholder fails runtime validation. api-contract.md declares
                // `performer` as `MiniTeamMember | null`, so null is the
                // canonical "unresolved" shape.
                // We still log once per miss so operators can audit performer drift.
                logger.LogWarning(
                    "Stage performer {PerformerUserId} not on manager {ManagerUserId}'s roster (feature {FeatureId}, stage {Stage})",
                    pid,
                    managerUserId,
                    featureId,
                    sp.Stage);
            }
        }

        return new StagePlanDetailResponse(
            PlanMapper.MapState(sp.Stage, logger),
            string.IsNullOrEmpty(sp.PlannedStart) ? null : sp.PlannedStart,
            string.IsNullOrEmpty(sp.PlannedEnd) ? null : sp.PlannedEnd,
            performerUserId,
            performer,
            sp.Version);
    }
}
