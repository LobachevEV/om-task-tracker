using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Proto.Users;

namespace OneMoreTaskTracker.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    UserService.UserServiceClient userService,
    JwtTokenService jwtTokenService) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(
        [FromBody] RegisterPayload payload,
        CancellationToken cancellationToken)
    {
        var response = await userService.RegisterAsync(new RegisterRequest
        {
            Email = payload.Email,
            Password = payload.Password,
            ManagerId = 0
        }, cancellationToken: cancellationToken);

        var token = jwtTokenService.GenerateToken(response.UserId, response.Email, response.Role,
            ToNullableManagerId(response.ManagerUserId));
        return Ok(new AuthResponse(token, response.UserId, response.Email, response.Role));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(
        [FromBody] LoginPayload payload,
        CancellationToken cancellationToken)
    {
        var response = await userService.AuthenticateAsync(new AuthenticateRequest
        {
            Email = payload.Email,
            Password = payload.Password
        }, cancellationToken: cancellationToken);

        if (!response.Success)
            return Unauthorized(new { error = "Invalid email or password" });

        var token = jwtTokenService.GenerateToken(response.UserId, response.Email, response.Role,
            ToNullableManagerId(response.ManagerUserId));
        return Ok(new AuthResponse(token, response.UserId, response.Email, response.Role));
    }

    private static int? ToNullableManagerId(int value) => value > 0 ? value : null;
}

public record RegisterPayload(
    [Required][EmailAddress] string Email,
    [Required][MinLength(8)] string Password);

public record LoginPayload(
    [Required][EmailAddress] string Email,
    [Required] string Password);

public record AuthResponse(string Token, int UserId, string Email, string Role);
