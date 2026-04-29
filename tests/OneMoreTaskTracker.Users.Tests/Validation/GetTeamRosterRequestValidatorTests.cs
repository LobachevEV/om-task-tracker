using FluentAssertions;
using OneMoreTaskTracker.Proto.Users;
using OneMoreTaskTracker.Users.Validators;
using Xunit;

namespace OneMoreTaskTracker.Users.Tests.Validation;

public sealed class GetTeamRosterRequestValidatorTests
{
    [Fact]
    public async Task Validate_WhenManagerIdIsZero_FailsWithManagerNotFoundMessage()
    {
        var validator = new GetTeamRosterRequestValidator();
        var request = new GetTeamRosterRequest { ManagerId = 0 };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle()
            .Which.ErrorMessage.Should().Be("Manager not found or user is not a manager");
    }

    [Fact]
    public async Task Validate_WhenManagerIdIsNegative_FailsWithManagerNotFoundMessage()
    {
        var validator = new GetTeamRosterRequestValidator();
        var request = new GetTeamRosterRequest { ManagerId = -1 };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle()
            .Which.ErrorMessage.Should().Be("Manager not found or user is not a manager");
    }

    [Fact]
    public async Task Validate_WhenManagerIdIsPositive_Passes()
    {
        var validator = new GetTeamRosterRequestValidator();
        var request = new GetTeamRosterRequest { ManagerId = 42 };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeTrue();
    }
}
