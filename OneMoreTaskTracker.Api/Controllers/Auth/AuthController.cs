using Microsoft.AspNetCore.Mvc;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Proto.Users;

namespace OneMoreTaskTracker.Api.Controllers.Auth;

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

        var token = jwtTokenService.GenerateToken(response);
        return Ok(new AuthResponse(token, response.UserId, response.Email, response.Role));
    }

    // Liveness probe used by the GAN harness evaluator (BE_HEALTH_URL) and
    // deployment health checks. Deliberately cheap: no DB / upstream calls.
    // Anonymous so probes do not need a token; returns only a static 200.
    [HttpGet("health")]
    [Microsoft.AspNetCore.Authorization.AllowAnonymous]
    public ActionResult Health() => Ok(new { status = "ok" });

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

        var token = jwtTokenService.GenerateToken(response);
        return Ok(new AuthResponse(token, response.UserId, response.Email, response.Role));
    }
}
