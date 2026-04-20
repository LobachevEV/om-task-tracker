using System.Net.Mail;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Proto.Users;
using OneMoreTaskTracker.Users.Data;
using OneMoreTaskTracker.Users.Services;
using static OneMoreTaskTracker.Users.Services.Roles;

namespace OneMoreTaskTracker.Users;

// TODO: add xUnit tests for Register (validation, duplicate email, BCrypt) and Authenticate (success, wrong password, missing user)
public class UserServiceHandler(UsersDbContext dbContext) : UserService.UserServiceBase
{
    private const int MinPasswordLength = 8;
    private const int MaxEmailLength = 254;

    public override async Task<RegisterResponse> Register(RegisterRequest request, ServerCallContext context)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "Email and password are required"));

        if (request.Email.Length > MaxEmailLength || !IsValidEmail(request.Email))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "Invalid email address"));

        if (request.Password.Length < MinPasswordLength)
            throw new RpcException(new Status(StatusCode.InvalidArgument,
                $"Password must be at least {MinPasswordLength} characters"));

        if (await dbContext.Users.AnyAsync(u => u.Email == request.Email, context.CancellationToken))
            throw new RpcException(new Status(StatusCode.AlreadyExists, "Email already registered"));

        string userRole;

        if (request.ManagerId == 0)
        {
            // Self-registration: always Manager, ignore sent role
            userRole = Roles.Manager;
        }
        else
        {
            // Managed creation: validate role and manager
            if (!Roles.DeveloperRoles.Contains(request.Role))
                throw new RpcException(new Status(StatusCode.InvalidArgument,
                    "Role must be one of: FrontendDeveloper, BackendDeveloper, Qa"));

            var manager = await dbContext.Users.FindAsync([request.ManagerId], context.CancellationToken);
            if (manager is null || manager.Role != Roles.Manager)
                throw new RpcException(new Status(StatusCode.InvalidArgument, "Invalid ManagerId"));

            userRole = request.Role;
        }

        var hash = await Task.Run(
            () => BCrypt.Net.BCrypt.HashPassword(request.Password, workFactor: 12), context.CancellationToken);

        var user = new User
        {
            Email = request.Email,
            PasswordHash = hash,
            Role = userRole,
            ManagerId = request.ManagerId > 0 ? request.ManagerId : null
        };

        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync(context.CancellationToken);

        return new RegisterResponse
        {
            UserId = user.Id,
            Email = user.Email,
            Role = user.Role,
            ManagerUserId = user.ManagerId ?? 0
        };
    }

    public override async Task<AuthenticateResponse> Authenticate(AuthenticateRequest request, ServerCallContext context)
    {
        var user = await dbContext.Users
            .FirstOrDefaultAsync(u => u.Email == request.Email, context.CancellationToken);

        if (user is null)
            return new AuthenticateResponse { Success = false };

        var valid = await Task.Run(
            () => BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash), context.CancellationToken);

        if (!valid)
            return new AuthenticateResponse { Success = false };

        return new AuthenticateResponse
        {
            Success = true,
            UserId = user.Id,
            Email = user.Email,
            Role = user.Role,
            ManagerUserId = user.ManagerId ?? 0
        };
    }

    public override async Task<GetTeamMemberIdsResponse> GetTeamMemberIds(
        GetTeamMemberIdsRequest request, ServerCallContext context)
    {
        var ids = await dbContext.Users
            .Where(u => u.ManagerId == request.ManagerId)
            .Select(u => u.Id)
            .ToListAsync(context.CancellationToken);

        var response = new GetTeamMemberIdsResponse();
        response.UserIds.Add(ids);
        return response;
    }

    public override async Task<GetTeamRosterResponse> GetTeamRoster(
        GetTeamRosterRequest request, ServerCallContext context)
    {
        var manager = await dbContext.Users.FindAsync(
            new object[] { request.ManagerId }, cancellationToken: context.CancellationToken);

        if (manager is null || manager.Role != Roles.Manager)
            throw new RpcException(new Status(StatusCode.InvalidArgument, "Manager not found or user is not a manager"));

        var members = await dbContext.Users
            .Where(u => u.ManagerId == request.ManagerId)
            .Select(u => new TeamRosterMember
            {
                UserId = u.Id,
                Email = u.Email,
                Role = u.Role,
                ManagerId = u.ManagerId ?? 0
            })
            .ToListAsync(context.CancellationToken);

        var response = new GetTeamRosterResponse();

        // Add manager row
        response.Members.Add(new TeamRosterMember
        {
            UserId = manager.Id,
            Email = manager.Email,
            Role = manager.Role,
            ManagerId = 0  // Manager has no manager
        });

        // Add team members
        response.Members.AddRange(members);

        return response;
    }

    public override async Task<DeleteUserResponse> DeleteUser(
        DeleteUserRequest request, ServerCallContext context)
    {
        var user = await dbContext.Users.FindAsync(
            new object[] { request.UserId }, cancellationToken: context.CancellationToken);

        if (user is null)
            throw new RpcException(new Status(StatusCode.NotFound, "User not found"));

        // Verify user belongs to the requesting manager's team
        if (user.ManagerId != request.ManagerId)
            throw new RpcException(new Status(StatusCode.PermissionDenied, "User is not on your team"));

        dbContext.Users.Remove(user);
        await dbContext.SaveChangesAsync(context.CancellationToken);

        return new DeleteUserResponse();
    }

    private static bool IsValidEmail(string email)
    {
        try
        {
            var addr = new MailAddress(email);
            return addr.Address == email;
        }
        catch
        {
            return false;
        }
    }
}
