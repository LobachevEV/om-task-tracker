using System.Net.Mail;
using FluentValidation;
using OneMoreTaskTracker.Proto.Users;
using OneMoreTaskTracker.Users.Services;

namespace OneMoreTaskTracker.Users.Validators;

public sealed class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    private const int MinPasswordLength = 8;
    private const int MaxEmailLength = 254;

    public RegisterRequestValidator()
    {
        RuleFor(r => r.Email)
            .Cascade(CascadeMode.Stop)
            .Must(e => !string.IsNullOrWhiteSpace(e))
            .WithMessage("Email and password are required")
            .Must(e => e.Length <= MaxEmailLength && IsValidEmail(e))
            .WithMessage("Invalid email address");

        RuleFor(r => r.Password)
            .Cascade(CascadeMode.Stop)
            .Must(p => !string.IsNullOrWhiteSpace(p))
            .WithMessage("Email and password are required")
            .MinimumLength(MinPasswordLength)
            .WithMessage($"Password must be at least {MinPasswordLength} characters");

        When(r => r.ManagerId != 0, () =>
        {
            RuleFor(r => r.Role)
                .Must(role => Roles.DeveloperRoles.Contains(role))
                .WithMessage("Role must be one of: FrontendDeveloper, BackendDeveloper, Qa");
        });
    }

    private static bool IsValidEmail(string email)
    {
        try
        {
            var addr = new MailAddress(email);
            return addr.Address == email;
        }
        catch
        {
            return false;
        }
    }
}
