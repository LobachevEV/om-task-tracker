using System.Security.Claims;
using Grpc.Core;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Proto.Tasks.TaskAggregateQuery;
using OneMoreTaskTracker.Proto.Users;

namespace OneMoreTaskTracker.Api.Controllers;

[ApiController]
[Route("api/team/members")]
[Authorize]
public class TeamController(
    UserService.UserServiceClient userService,
    TaskAggregateQuery.TaskAggregateQueryClient taskAggregateQueryClient) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<TeamRosterDto[]>> GetRoster(CancellationToken cancellationToken)
    {
        var callerId = User.GetUserId();
        var callerRole = User.FindFirstValue(ClaimTypes.Role);

        if (callerId == 0 || string.IsNullOrEmpty(callerRole))
            return Unauthorized();

        int managerId;
        if (callerRole == Roles.Manager)
        {
            managerId = callerId;
        }
        else if (Roles.DeveloperRoles.Contains(callerRole))
        {
            var managerIdClaim = User.FindFirst("manager_id")?.Value;
            if (string.IsNullOrEmpty(managerIdClaim) || !int.TryParse(managerIdClaim, out managerId) || managerId == 0)
            {
                return Ok(Array.Empty<TeamRosterDto>());
            }
        }
        else
        {
            return Unauthorized();
        }

        try
        {
            var rosterRequest = new GetTeamRosterRequest { ManagerId = managerId };
            var rosterResponse = await userService.GetTeamRosterAsync(rosterRequest, cancellationToken: cancellationToken);

            var userIds = rosterResponse.Members.Select(m => m.UserId).ToList();
            var summaryRequest = new BatchGetAssigneeTaskSummaryRequest();
            summaryRequest.AssigneeUserIds.AddRange(userIds);
            var summaryResponse = await taskAggregateQueryClient.BatchGetAssigneeTaskSummaryAsync(summaryRequest, cancellationToken: cancellationToken);

            var statusMap = summaryResponse.Summaries.ToDictionary(s => s.AssigneeUserId);

            var roster = rosterResponse.Members
                .Select(member =>
                {
                    statusMap.TryGetValue(member.UserId, out var status);
                    return new TeamRosterDto(
                        UserId: member.UserId,
                        Email: member.Email,
                        Role: member.Role,
                        ManagerId: member.ManagerId == 0 ? null : member.ManagerId,
                        DisplayName: ExtractDisplayName(member.Email),
                        IsSelf: member.UserId == callerId,
                        Status: status != null ? new UserStatusDto(
                            Active: status.ActiveCount,
                            LastActive: status.LastActivityAt?.ToDateTime(),
                            Mix: new StateMixDto(
                                InDev: status.Mix.InDev,
                                MrToRelease: status.Mix.MrToRelease,
                                InTest: status.Mix.InTest,
                                MrToMaster: status.Mix.MrToMaster,
                                Completed: status.Mix.Completed
                            )
                        ) : new UserStatusDto(0, null, new StateMixDto(0, 0, 0, 0, 0))
                    );
                })
                .ToArray();

            return Ok(roster);
        }
        catch (RpcException ex) when (ex.StatusCode == Grpc.Core.StatusCode.InvalidArgument)
        {
            return BadRequest(new { code = "invalid_manager", message = "Manager not found" });
        }
    }

    [HttpDelete("{userId}")]
    [Authorize(Roles = Roles.Manager)]
    public async Task<IActionResult> RemoveMember(int userId, CancellationToken cancellationToken)
    {
        var callerId = User.GetUserId();

        if (callerId == 0)
            return Unauthorized();

        var deleteRequest = new DeleteUserRequest
        {
            UserId = userId,
            ManagerId = callerId
        };

        await userService.DeleteUserAsync(deleteRequest, cancellationToken: cancellationToken);

        return NoContent();
    }

    [HttpPost]
    [Authorize(Roles = Roles.Manager)]
    public async Task<ActionResult<InviteMemberResponse>> InviteMember(
        [FromBody] InviteMemberRequest request,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (!Roles.DeveloperRoles.Contains(request.Role))
            return BadRequest(new { code = "invalid_role", message = "Неверная роль · Invalid role" });

        var managerId = User.GetUserId();
        var tempPassword = TemporaryPasswordGenerator.Generate();

        try
        {
            var grpcRequest = new RegisterRequest
            {
                Email = request.Email,
                Password = tempPassword,
                ManagerId = managerId,
                Role = request.Role
            };

            var grpcResponse = await userService.RegisterAsync(grpcRequest, cancellationToken: cancellationToken);

            var response = new InviteMemberResponse(
                UserId: grpcResponse.UserId,
                Email: grpcResponse.Email,
                Role: grpcResponse.Role,
                ManagerId: managerId,
                TemporaryPassword: tempPassword);

            Response.Headers.CacheControl = "no-store";

            return Created($"/api/team/members/{grpcResponse.UserId}", response);
        }
        catch (Grpc.Core.RpcException ex) when (ex.StatusCode == Grpc.Core.StatusCode.AlreadyExists)
        {
            return Conflict(new { code = "email_already_registered", message = "Этот email уже зарегистрирован" });
        }
        catch (Grpc.Core.RpcException ex) when (ex.StatusCode == Grpc.Core.StatusCode.InvalidArgument)
        {
            return BadRequest(new { code = "validation_error", message = ex.Status.Detail });
        }
    }

    private static string ExtractDisplayName(string email)
    {
        var localPart = email.Split('@')[0];
        return string.Join(" ", localPart.Split('.', '-', '_').Select(part =>
            char.ToUpperInvariant(part[0]) + part[1..]));
    }
}
