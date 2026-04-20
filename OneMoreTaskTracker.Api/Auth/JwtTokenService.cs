using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace OneMoreTaskTracker.Api.Auth;

public sealed class JwtTokenService
{
    private readonly JwtOptions _options;
    private readonly SigningCredentials _credentials;
    private static readonly JwtSecurityTokenHandler Handler = new();

    public JwtTokenService(IOptions<JwtOptions> options)
    {
        _options = options.Value;
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Secret));
        _credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
    }

    public string GenerateToken(int userId, string email, string role, int? managerId = null)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Email, email),
            new Claim(ClaimTypes.Role, role)
        };

        if (managerId.HasValue)
        {
            claims.Add(new Claim("manager_id", managerId.Value.ToString()));
        }

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_options.ExpirationMinutes),
            signingCredentials: _credentials);

        return Handler.WriteToken(token);
    }

    /// <summary>
    /// Generates a JWT token from an IAuthUserContext, collapsing the 4-parameter
    /// overload into a single interface argument per microservices/contracts.md.
    /// </summary>
    public string GenerateToken(IAuthUserContext userContext)
    {
        return GenerateToken(userContext.UserId, userContext.Email, userContext.Role, userContext.ManagerId);
    }
}
