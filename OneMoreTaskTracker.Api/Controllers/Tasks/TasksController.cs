using Google.Protobuf.WellKnownTypes;
using Grpc.Core;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Proto.Tasks;
using OneMoreTaskTracker.Proto.Tasks.CreateTaskCommand;
using OneMoreTaskTracker.Proto.Tasks.GetTaskQuery;
using OneMoreTaskTracker.Proto.Tasks.ListTasksQuery;
using OneMoreTaskTracker.Proto.Users;
using CreateTaskDto = OneMoreTaskTracker.Proto.Tasks.CreateTaskCommand.TaskDto;

namespace OneMoreTaskTracker.Api.Controllers.Tasks;

[ApiController]
[Authorize]
[Route("api/tasks")]
public class TasksController(
    TaskCreator.TaskCreatorClient taskCreator,
    TaskLister.TaskListerClient taskLister,
    TaskGetter.TaskGetterClient taskGetter,
    TaskMover.TaskMoverClient taskMover,
    UserService.UserServiceClient userService,
    ILogger<TasksController> logger) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<TaskResponse>>> GetTasks(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var role = User.GetRole();
        var teamMemberIds = role == Roles.Manager
            ? await GetTeamMemberIds(userId, cancellationToken)
            : [];

        var response = await taskLister.ListTasksAsync(new ListTasksRequest
        {
            UserId = userId,
            Role = role,
            TeamMemberIds = { teamMemberIds }
        }, cancellationToken: cancellationToken);

        return Ok(response.Tasks.Select(t => new TaskResponse(t.Id, t.JiraTaskId, TasksMapper.MapState(t.State, logger), t.UserId)));
    }

    [HttpGet("{jiraId}")]
    public async Task<ActionResult<TaskDetailResponse>> GetTask(
        string jiraId,
        CancellationToken cancellationToken)
    {
        var response = await taskGetter.GetAsync(new GetTaskRequest
        {
            TaskId = jiraId,
            UserId = User.GetUserId(),
            FirstPushDate = DefaultFirstPushDate()
        }, cancellationToken: cancellationToken);

        var projects = response.Projects
            .Select(p => new ProjectResponse(p.Id, p.Name))
            .ToList();

        var mergeRequests = response.MergeRequests
            .Select(mr => new MergeRequestResponse(mr.Id, mr.Title, mr.SourceBranch, mr.TargetBranch))
            .ToList();

        return Ok(new TaskDetailResponse(jiraId, TasksMapper.MapState(response.State, logger), projects, mergeRequests));
    }

    private static readonly TimeSpan DefaultLookback = TimeSpan.FromDays(365);
    private static Timestamp DefaultFirstPushDate() =>
        Timestamp.FromDateTime(DateTime.UtcNow - DefaultLookback);

    [HttpPost]
    public async Task<ActionResult<TaskResponse>> CreateTask(
        [FromBody] CreateTaskPayload payload,
        CancellationToken cancellationToken)
    {
        var startDate = (payload.StartDate ?? DateTime.UtcNow - DefaultLookback).ToUniversalTime();

        using var call = taskCreator.Create(new CreateTaskRequest
        {
            JiraTaskId = payload.JiraId,
            UserId = User.GetUserId(),
            StartDate = Timestamp.FromDateTime(startDate),
            FeatureId = payload.FeatureId
        }, cancellationToken: cancellationToken);

        CreateTaskDto? lastTask = null;
        await foreach (var response in call.ResponseStream.ReadAllAsync(cancellationToken))
            lastTask = response.Task;

        if (lastTask is null)
            return StatusCode(500, "Task creation returned no response");

        return Ok(new TaskResponse(lastTask.Id, lastTask.JiraTaskId, TasksMapper.MapState(lastTask.State, logger), User.GetUserId()));
    }

    [HttpPost("{jiraId}/move")]
    public async Task<ActionResult<TaskMoveResponse>> MoveTask(
        string jiraId,
        CancellationToken cancellationToken)
    {
        using var call = taskMover.Handle(new MoveTaskCommand
        {
            UserId = User.GetUserId(),
            TaskId = jiraId,
            FirstPushDate = DefaultFirstPushDate()
        }, cancellationToken: cancellationToken);

        MoveTaskResponse? last = null;
        await foreach (var response in call.ResponseStream.ReadAllAsync(cancellationToken))
            last = response;

        if (last is null)
            return StatusCode(500, "Move task returned no response");

        return Ok(new TaskMoveResponse(
            TasksMapper.MapState(last.State, logger),
            last.Projects.Select(p => new ProjectResponse(int.Parse(p.Id), p.Name)).ToList()));
    }

    private async Task<IEnumerable<int>> GetTeamMemberIds(int userId, CancellationToken cancellationToken)
    {
        var teamResponse = await userService.GetTeamMemberIdsAsync(
            new GetTeamMemberIdsRequest { ManagerId = userId },
            cancellationToken: cancellationToken);

        return teamResponse.UserIds.Append(userId);
    }
}
