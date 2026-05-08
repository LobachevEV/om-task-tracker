using FluentValidation;
using OneMoreTaskTracker.Proto.Users;

namespace OneMoreTaskTracker.Users.Validators;

public sealed class IsTeamMemberRequestValidator : AbstractValidator<IsTeamMemberRequest>
{
    public IsTeamMemberRequestValidator()
    {
        RuleFor(r => r.ManagerUserId)
            .GreaterThan(0)
            .WithMessage("manager_user_id must be greater than 0");

        RuleFor(r => r.MemberUserId)
            .GreaterThan(0)
            .WithMessage("member_user_id must be greater than 0");
    }
}
