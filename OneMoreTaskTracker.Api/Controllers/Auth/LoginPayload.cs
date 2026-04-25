using System.ComponentModel.DataAnnotations;

namespace OneMoreTaskTracker.Api.Controllers.Auth;

public record LoginPayload(
    [Required][EmailAddress] string Email,
    [Required] string Password);
