using System.ComponentModel.DataAnnotations;
using Grpc.Core;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Proto.Users;
using OneMoreTaskTracker.Proto.Tasks.GetUserStatusQuery;

namespace OneMoreTaskTracker.Api.Controllers;

[ApiController]
[Route("api/team/members")]
[Authorize]
public class TeamController(
    UserService.UserServiceClient userService,
    UserStatusQuery.UserStatusQueryClient userStatusQueryClient) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<TeamRosterDto[]>> GetRoster(CancellationToken cancellationToken)
    {
        var callerId = User.GetUserId();
        var callerRole = User.FindFirst("role")?.Value;

        if (callerId == 0 || string.IsNullOrEmpty(callerRole))
            return Unauthorized();

        // Determine which manager's roster to fetch
        int managerId;
        if (callerRole == Roles.Manager)
        {
            managerId = callerId;
        }
        else if (Roles.DeveloperRoles.Contains(callerRole))
        {
            // Get caller's manager ID from the token (if available)
            var managerIdClaim = User.FindFirst("manager_id")?.Value;
            if (string.IsNullOrEmpty(managerIdClaim) || !int.TryParse(managerIdClaim, out managerId) || managerId == 0)
            {
                // Developer with no manager - return empty roster
                return Ok(Array.Empty<TeamRosterDto>());
            }
        }
        else
        {
            return Unauthorized();
        }

        try
        {
            // Fetch roster from Users service
            var rosterRequest = new GetTeamRosterRequest { ManagerId = managerId };
            var rosterResponse = await userService.GetTeamRosterAsync(rosterRequest, cancellationToken: cancellationToken);

            // Fetch user statuses from Tasks service
            var userIds = rosterResponse.Members.Select(m => m.UserId).ToList();
            var statusRequest = new BatchGetUserStatusRequest();
            statusRequest.UserIds.AddRange(userIds);
            var statusResponse = await userStatusQueryClient.BatchGetUserStatusAsync(statusRequest, cancellationToken: cancellationToken);

            // Create status map
            var statusMap = statusResponse.Statuses.ToDictionary(s => s.UserId);

            // Merge and transform
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
                            Active: status.Active,
                            LastActive: status.LastActive?.ToDateTime(),
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

        try
        {
            var deleteRequest = new DeleteUserRequest
            {
                UserId = userId,
                ManagerId = callerId
            };

            await userService.DeleteUserAsync(deleteRequest, cancellationToken: cancellationToken);

            return NoContent();
        }
        catch (RpcException ex) when (ex.StatusCode == Grpc.Core.StatusCode.NotFound)
        {
            return NotFound();
        }
        catch (RpcException ex) when (ex.StatusCode == Grpc.Core.StatusCode.PermissionDenied)
        {
            return Forbid();
        }
    }

    [HttpPost]
    [Authorize(Roles = Roles.Manager)]
    public async Task<ActionResult<InviteMemberResponse>> InviteMember(
        [FromBody] InviteMemberRequest request,
        CancellationToken cancellationToken)
    {
        // Validate request
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        // Validate role is one of the developer roles
        if (!Roles.DeveloperRoles.Contains(request.Role))
            return BadRequest(new { code = "invalid_role", message = "Неверная роль · Invalid role" });

        // Get the caller's user ID from the JWT token
        var managerId = User.GetUserId();

        // Generate temporary password
        var tempPassword = TemporaryPasswordGenerator.Generate();

        // Call gRPC service to register the user
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

            // Return 201 Created with response
            var response = new InviteMemberResponse(
                UserId: grpcResponse.UserId,
                Email: grpcResponse.Email,
                Role: grpcResponse.Role,
                ManagerId: managerId,
                TemporaryPassword: tempPassword);

            // Set Cache-Control: no-store to prevent password caching
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
        // Convert "john.doe" -> "John Doe"
        return string.Join(" ", localPart.Split('.', '-', '_').Select(part =>
            char.ToUpperInvariant(part[0]) + part[1..]));
    }
}

public sealed record InviteMemberRequest(
    [Required][EmailAddress][MaxLength(254)] string Email,
    [Required] string Role);

public sealed record InviteMemberResponse(
    int UserId,
    string Email,
    string Role,
    int ManagerId,
    string TemporaryPassword);

public sealed record TeamRosterDto(
    int UserId,
    string Email,
    string Role,
    int? ManagerId,
    string DisplayName,
    bool IsSelf,
    UserStatusDto Status);

public sealed record UserStatusDto(
    int Active,
    DateTime? LastActive,
    StateMixDto Mix);

public sealed record StateMixDto(
    int InDev,
    int MrToRelease,
    int InTest,
    int MrToMaster,
    int Completed);
