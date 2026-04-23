using System.ComponentModel.DataAnnotations;
using Grpc.Core;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Proto.Features;
using OneMoreTaskTracker.Proto.Features.CreateFeatureCommand;
using OneMoreTaskTracker.Proto.Features.GetFeatureQuery;
using OneMoreTaskTracker.Proto.Features.ListFeaturesQuery;
using OneMoreTaskTracker.Proto.Features.UpdateFeatureCommand;
using OneMoreTaskTracker.Proto.Tasks;
using OneMoreTaskTracker.Proto.Tasks.AttachTaskCommand;
using OneMoreTaskTracker.Proto.Tasks.ListTasksQuery;
using OneMoreTaskTracker.Proto.Users;
using CreateFeatureDto = OneMoreTaskTracker.Proto.Features.CreateFeatureCommand.FeatureDto;
using UpdateFeatureDto = OneMoreTaskTracker.Proto.Features.UpdateFeatureCommand.FeatureDto;
using ListFeatureDto = OneMoreTaskTracker.Proto.Features.ListFeaturesQuery.FeatureDto;
using GetFeatureDto = OneMoreTaskTracker.Proto.Features.GetFeatureQuery.FeatureDto;
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
            features = features.Where(f => MapState(f.State).Equals(state, StringComparison.OrdinalIgnoreCase));

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
            .Select(f => MapSummary(f, tasksByFeature))
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

        var lead = BuildMiniTeamMember(feature.LeadUserId, roster);
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
            .Select(uid => BuildMiniTeamMember(uid, roster))
            .ToList();

        var summary = MapSummary(feature, tasksByFeature: new Dictionary<int, List<int>>());

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
        return Ok(MapSummary(created, new Dictionary<int, List<int>>()));
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

        var request = new UpdateFeatureRequest
        {
            Id = id,
            Title = body.Title ?? string.Empty,
            Description = body.Description ?? string.Empty,
            PlannedStart = body.PlannedStart ?? string.Empty,
            PlannedEnd = body.PlannedEnd ?? string.Empty,
            LeadUserId = body.LeadUserId.GetValueOrDefault(),
            State = ParseState(body.State)
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
                if (string.IsNullOrEmpty(sp.Stage))
                    return BadRequest(new { error = "Invalid request data" });

                if (!TryParseStage(sp.Stage, out var protoStage))
                    return BadRequest(new { error = "Invalid request data" });

                if (!seenStages.Add(sp.Stage))
                    return BadRequest(new { error = "Invalid request data" });

                request.StagePlans.Add(new ProtoFeatureStagePlan
                {
                    Stage           = protoStage,
                    PlannedStart    = sp.PlannedStart ?? string.Empty,
                    PlannedEnd      = sp.PlannedEnd   ?? string.Empty,
                    // performer_user_id on the wire = 0 means "unassigned"; we
                    // coerce negative / zero inputs to 0 defensively.
                    PerformerUserId = sp.PerformerUserId is { } p && p > 0 ? p : 0,
                });
            }
        }

        var updated = await featureUpdater.UpdateAsync(request, cancellationToken: ct);
        return Ok(MapSummary(updated, new Dictionary<int, List<int>>()));
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

        return Ok(MapSummary(feature, new Dictionary<int, List<int>>()));
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

        return Ok(MapSummary(feature, new Dictionary<int, List<int>>()));
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

    private static MiniTeamMemberResponse BuildMiniTeamMember(
        int userId,
        IReadOnlyDictionary<int, TeamRosterMember> roster)
    {
        if (userId <= 0)
            return new MiniTeamMemberResponse(0, string.Empty, string.Empty, string.Empty);

        if (roster.TryGetValue(userId, out var member))
            return new MiniTeamMemberResponse(
                member.UserId,
                member.Email,
                ExtractDisplayName(member.Email),
                member.Role);

        return new MiniTeamMemberResponse(userId, string.Empty, string.Empty, string.Empty);
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
            performer = BuildMiniTeamMember(pid, roster);
            if (!roster.ContainsKey(pid))
            {
                // Stale ids are surfaced to FE as a placeholder member; we also
                // log once per miss (matches the existing stale-lead log shape)
                // so operators can audit performer drift without exposing PII.
                logger.LogWarning(
                    "Stage performer {PerformerUserId} not on manager {ManagerUserId}'s roster (feature {FeatureId}, stage {Stage})",
                    pid,
                    managerUserId,
                    featureId,
                    sp.Stage);
            }
        }

        return new StagePlanDetailResponse(
            MapState(sp.Stage),
            string.IsNullOrEmpty(sp.PlannedStart) ? null : sp.PlannedStart,
            string.IsNullOrEmpty(sp.PlannedEnd) ? null : sp.PlannedEnd,
            performerUserId,
            performer);
    }

    private StagePlanResponse BuildStagePlan(ProtoFeatureStagePlan sp) =>
        new(
            MapState(sp.Stage),
            string.IsNullOrEmpty(sp.PlannedStart) ? null : sp.PlannedStart,
            string.IsNullOrEmpty(sp.PlannedEnd) ? null : sp.PlannedEnd,
            sp.PerformerUserId > 0 ? (int?)sp.PerformerUserId : null);

    private static string ExtractDisplayName(string email)
    {
        if (string.IsNullOrEmpty(email))
            return string.Empty;
        var local = email.Split('@')[0];
        return string.Join(" ", local.Split('.', '-', '_').Select(p =>
            p.Length == 0 ? p : char.ToUpperInvariant(p[0]) + p[1..]));
    }

    private FeatureSummaryResponse MapSummary(
        CreateFeatureDto f,
        IReadOnlyDictionary<int, List<int>> tasksByFeature) =>
        BuildSummary(f.Id, f.Title, f.Description, f.State, f.PlannedStart, f.PlannedEnd, f.LeadUserId, f.ManagerUserId, f.StagePlans, tasksByFeature);

    private FeatureSummaryResponse MapSummary(
        UpdateFeatureDto f,
        IReadOnlyDictionary<int, List<int>> tasksByFeature) =>
        BuildSummary(f.Id, f.Title, f.Description, f.State, f.PlannedStart, f.PlannedEnd, f.LeadUserId, f.ManagerUserId, f.StagePlans, tasksByFeature);

    private FeatureSummaryResponse MapSummary(
        ListFeatureDto f,
        IReadOnlyDictionary<int, List<int>> tasksByFeature) =>
        BuildSummary(f.Id, f.Title, f.Description, f.State, f.PlannedStart, f.PlannedEnd, f.LeadUserId, f.ManagerUserId, f.StagePlans, tasksByFeature);

    private FeatureSummaryResponse MapSummary(
        GetFeatureDto f,
        IReadOnlyDictionary<int, List<int>> tasksByFeature) =>
        BuildSummary(f.Id, f.Title, f.Description, f.State, f.PlannedStart, f.PlannedEnd, f.LeadUserId, f.ManagerUserId, f.StagePlans, tasksByFeature);

    private FeatureSummaryResponse BuildSummary(
        int id,
        string title,
        string description,
        FeatureState state,
        string plannedStart,
        string plannedEnd,
        int leadUserId,
        int managerUserId,
        IEnumerable<ProtoFeatureStagePlan> stagePlans,
        IReadOnlyDictionary<int, List<int>> tasksByFeature)
    {
        var taskIds = tasksByFeature.TryGetValue(id, out var ids) ? (IReadOnlyList<int>)ids : Array.Empty<int>();
        var plans = stagePlans.Select(BuildStagePlan).ToList();
        return new FeatureSummaryResponse(
            id,
            title,
            string.IsNullOrEmpty(description) ? null : description,
            MapState(state),
            string.IsNullOrEmpty(plannedStart) ? null : plannedStart,
            string.IsNullOrEmpty(plannedEnd) ? null : plannedEnd,
            leadUserId,
            managerUserId,
            taskIds.Count,
            taskIds,
            plans);
    }

    private string MapState(FeatureState state) => state switch
    {
        FeatureState.CsApproving => "CsApproving",
        FeatureState.Development => "Development",
        FeatureState.Testing => "Testing",
        FeatureState.EthalonTesting => "EthalonTesting",
        FeatureState.LiveRelease => "LiveRelease",
        _ => LogAndReturnUnknown(state)
    };

    private string LogAndReturnUnknown(FeatureState state)
    {
        logger.LogWarning("Unexpected FeatureState value {State}; returning \"Unknown\"", state);
        return "Unknown";
    }

    private static FeatureState ParseState(string? input)
    {
        if (string.IsNullOrEmpty(input))
            return FeatureState.CsApproving;

        return input switch
        {
            "CsApproving" => FeatureState.CsApproving,
            "Development" => FeatureState.Development,
            "Testing" => FeatureState.Testing,
            "EthalonTesting" => FeatureState.EthalonTesting,
            "LiveRelease" => FeatureState.LiveRelease,
            _ => FeatureState.CsApproving
        };
    }

    // Strict stage-name parser used by UpdateFeature — unknown / blank names
    // surface as a 400 (rejected at the controller boundary, before we hit the
    // Features service). Unlike ParseState's lenient fallback, this intentionally
    // returns false on unknown input so the caller can emit a BadRequest.
    private static bool TryParseStage(string raw, out FeatureState stage)
    {
        switch (raw)
        {
            case "CsApproving":    stage = FeatureState.CsApproving;    return true;
            case "Development":    stage = FeatureState.Development;    return true;
            case "Testing":        stage = FeatureState.Testing;        return true;
            case "EthalonTesting": stage = FeatureState.EthalonTesting; return true;
            case "LiveRelease":    stage = FeatureState.LiveRelease;    return true;
            default:
                stage = default;
                return false;
        }
    }
}

public record FeatureSummaryResponse(
    int Id,
    string Title,
    string? Description,
    string State,
    string? PlannedStart,
    string? PlannedEnd,
    int LeadUserId,
    int ManagerUserId,
    int TaskCount,
    IReadOnlyList<int> TaskIds,
    IReadOnlyList<StagePlanResponse> StagePlans);

public record FeatureDetailResponse(
    FeatureSummaryResponse Feature,
    IReadOnlyList<AttachedTaskResponse> Tasks,
    MiniTeamMemberResponse Lead,
    IReadOnlyList<MiniTeamMemberResponse> MiniTeam,
    IReadOnlyList<StagePlanDetailResponse> StagePlans);

public record AttachedTaskResponse(int Id, string JiraId, string State, int UserId);

public record MiniTeamMemberResponse(int UserId, string Email, string DisplayName, string Role);

// List-row stage plan — id-only performer. `null` planned_* dates when unset.
public record StagePlanResponse(
    string Stage,
    string? PlannedStart,
    string? PlannedEnd,
    int? PerformerUserId);

// Detail stage plan — resolved mini-member for the performer; null when
// unassigned or when the stale id is no longer on the roster (a placeholder
// MiniTeamMemberResponse with empty fields is emitted instead so the shape
// is stable for the FE).
public record StagePlanDetailResponse(
    string Stage,
    string? PlannedStart,
    string? PlannedEnd,
    int? PerformerUserId,
    MiniTeamMemberResponse? Performer);

public record CreateFeaturePayload(
    [Required][MaxLength(200)] string Title,
    [MaxLength(4000)] string? Description,
    int? LeadUserId,
    string? PlannedStart,
    string? PlannedEnd);

public record UpdateFeaturePayload(
    [MaxLength(200)] string? Title,
    [MaxLength(4000)] string? Description,
    int? LeadUserId,
    string? PlannedStart,
    string? PlannedEnd,
    string? State,
    // Omit (null) = do not touch stage plans.
    // Present with Count != 5 or unknown / duplicate stages → 400.
    IReadOnlyList<StagePlanPayload>? StagePlans);

public record StagePlanPayload(
    string Stage,
    string? PlannedStart,
    string? PlannedEnd,
    int? PerformerUserId);

public record DetachTaskBody([Required] int ReassignToFeatureId);
