using FluentValidation;
using OneMoreTaskTracker.Proto.Users;

namespace OneMoreTaskTracker.Users.Validators;

public sealed class IsTeamMemberRequestValidator : AbstractValidator<IsTeamMemberRequest>
{
    public IsTeamMemberRequestValidator()
    {
        RuleFor(r => r.ManagerId)
            .GreaterThan(0)
            .WithMessage("ManagerId is required");

        RuleFor(r => r.UserId)
            .GreaterThan(0)
            .WithMessage("UserId is required");
    }
}
