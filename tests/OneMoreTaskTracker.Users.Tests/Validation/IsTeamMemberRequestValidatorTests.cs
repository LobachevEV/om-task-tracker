using FluentAssertions;
using OneMoreTaskTracker.Proto.Users;
using OneMoreTaskTracker.Users.Validators;
using Xunit;

namespace OneMoreTaskTracker.Users.Tests.Validation;

public sealed class IsTeamMemberRequestValidatorTests
{
    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task Validate_WhenManagerIdIsNotPositive_FailsWithManagerIdRequired(int managerId)
    {
        var validator = new IsTeamMemberRequestValidator();
        var request = new IsTeamMemberRequest { ManagerId = managerId, UserId = 1 };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.ErrorMessage == "ManagerId is required");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task Validate_WhenUserIdIsNotPositive_FailsWithUserIdRequired(int userId)
    {
        var validator = new IsTeamMemberRequestValidator();
        var request = new IsTeamMemberRequest { ManagerId = 1, UserId = userId };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.ErrorMessage == "UserId is required");
    }

    [Fact]
    public async Task Validate_WhenBothIdsArePositive_Passes()
    {
        var validator = new IsTeamMemberRequestValidator();
        var request = new IsTeamMemberRequest { ManagerId = 7, UserId = 42 };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeTrue();
    }
}
