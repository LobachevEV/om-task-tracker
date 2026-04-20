using OneMoreTaskTracker.Api.Auth;

namespace OneMoreTaskTracker.Proto.Users;

// Bridges proto-generated AuthenticateResponse to the domain IAuthUserContext
// per ~/.claude/rules/microservices/contracts.md (no transport types in domain).
// UserId/Email/Role match the interface implicitly via the proto's public
// properties; only ManagerId needs an explicit member because the proto field
// is int ManagerUserId (0 = none) and the interface is int?.
public partial class AuthenticateResponse : IAuthUserContext
{
    int? IAuthUserContext.ManagerId => ManagerUserId != 0 ? ManagerUserId : null;
}
