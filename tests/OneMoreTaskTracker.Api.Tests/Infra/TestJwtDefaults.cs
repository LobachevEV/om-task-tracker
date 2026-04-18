namespace OneMoreTaskTracker.Api.Tests.Infra;

internal static class TestJwtDefaults
{
    public const string Secret = "test-secret-key-that-is-at-least-32-chars-long!!";
    public const string Issuer = "TestIssuer";
    public const string Audience = "TestAudience";
    public const string ExpirationMinutes = "60";
}
