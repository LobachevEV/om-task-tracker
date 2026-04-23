using System.ComponentModel.DataAnnotations;

namespace OneMoreTaskTracker.Api.Controllers;

public record RegisterPayload(
    [Required][EmailAddress] string Email,
    [Required][MinLength(8)] string Password);
