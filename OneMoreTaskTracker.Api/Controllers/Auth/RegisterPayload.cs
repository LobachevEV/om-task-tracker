using System.ComponentModel.DataAnnotations;

namespace OneMoreTaskTracker.Api.Controllers.Auth;

public record RegisterPayload(
    [Required][EmailAddress] string Email,
    [Required][MinLength(8)] string Password);
