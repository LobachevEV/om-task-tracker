namespace OneMoreTaskTracker.Api.Controllers;

public record AuthResponse(string Token, int UserId, string Email, string Role);
