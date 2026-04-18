namespace OneMoreTaskTracker.Tasks.Tasks;

public static class Roles
{
    public const string Manager = "Manager";
    public const string FrontendDeveloper = "FrontendDeveloper";
    public const string BackendDeveloper = "BackendDeveloper";
    public const string Qa = "Qa";

    public static readonly IReadOnlySet<string> DeveloperRoles =
        new HashSet<string> { FrontendDeveloper, BackendDeveloper, Qa };

    public static bool IsValid(string? role) =>
        role is Manager or FrontendDeveloper or BackendDeveloper or Qa;
}
