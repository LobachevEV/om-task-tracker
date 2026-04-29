using FluentValidation;
using OneMoreTaskTracker.Proto.Users;

namespace OneMoreTaskTracker.Users.Validators;

public sealed class GetTeamRosterRequestValidator : AbstractValidator<GetTeamRosterRequest>
{
    public GetTeamRosterRequestValidator()
    {
        RuleFor(r => r.ManagerId)
            .GreaterThan(0)
            .WithMessage("Manager not found or user is not a manager");
    }
}
