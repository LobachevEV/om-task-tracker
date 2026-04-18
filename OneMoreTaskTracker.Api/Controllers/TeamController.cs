using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Proto.Users;

namespace OneMoreTaskTracker.Api.Controllers;

[ApiController]
[Route("api/team/members")]
[Authorize(Roles = Roles.Manager)]
public class TeamController(UserService.UserServiceClient userService) : ControllerBase
{
    [HttpPost]
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
