namespace OneMoreTaskTracker.Api.Controllers.Auth;

public record AuthResponse(string Token, int UserId, string Email, string Role);
