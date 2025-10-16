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

    public string GenerateToken(int userId, string email, string role)
    {
        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims:
            [
                new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                new Claim(ClaimTypes.Email, email),
                new Claim(ClaimTypes.Role, role)
            ],
            expires: DateTime.UtcNow.AddMinutes(_options.ExpirationMinutes),
            signingCredentials: _credentials);

        return Handler.WriteToken(token);
    }
}
