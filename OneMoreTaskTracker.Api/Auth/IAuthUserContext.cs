namespace OneMoreTaskTracker.Api.Auth;

/// <summary>
/// Represents the user context needed for JWT token generation.
/// Implemented by proto-generated response types (RegisterResponse, AuthenticateResponse)
/// to maintain separation between transport and domain layers.
/// </summary>
public interface IAuthUserContext
{
    int UserId { get; }
    string Email { get; }
    string Role { get; }
    int? ManagerId { get; }
}
