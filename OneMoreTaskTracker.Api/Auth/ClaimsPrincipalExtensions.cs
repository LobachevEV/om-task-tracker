using System.Globalization;
using System.Security.Claims;

namespace OneMoreTaskTracker.Api.Auth;

public static class ClaimsPrincipalExtensions
{
    extension(ClaimsPrincipal principal)
    {
        public int GetUserId()
        {
            var value = principal.FindFirstValue(ClaimTypes.NameIdentifier)
                        ?? throw new InvalidOperationException("NameIdentifier claim is missing from token");
            return int.Parse(value, CultureInfo.InvariantCulture);
        }
        
        public string GetRole()
            => principal.FindFirstValue(ClaimTypes.Role)
               ?? throw new InvalidOperationException("Role claim is missing from token");
    }
}
