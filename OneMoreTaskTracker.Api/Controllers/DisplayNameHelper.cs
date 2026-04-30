namespace OneMoreTaskTracker.Api.Controllers;

internal static class DisplayNameHelper
{
    internal static string ExtractDisplayName(string email)
    {
        if (string.IsNullOrEmpty(email))
            return string.Empty;
        var local = email.Split('@')[0];
        return string.Join(" ", local.Split('.', '-', '_').Select(p =>
            p.Length == 0 ? p : char.ToUpperInvariant(p[0]) + p[1..]));
    }
}
