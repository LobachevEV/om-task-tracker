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
    public async Task Validate_WhenManagerUserIdIsNotPositive_Fails(int managerId)
    {
        var validator = new IsTeamMemberRequestValidator();
        var request = new IsTeamMemberRequest { ManagerUserId = managerId, MemberUserId = 1 };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.ErrorMessage == "manager_user_id must be greater than 0");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task Validate_WhenMemberUserIdIsNotPositive_Fails(int memberId)
    {
        var validator = new IsTeamMemberRequestValidator();
        var request = new IsTeamMemberRequest { ManagerUserId = 1, MemberUserId = memberId };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.ErrorMessage == "member_user_id must be greater than 0");
    }

    [Fact]
    public async Task Validate_WhenBothIdsArePositive_Passes()
    {
        var validator = new IsTeamMemberRequestValidator();
        var request = new IsTeamMemberRequest { ManagerUserId = 1, MemberUserId = 2 };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WhenBothIdsAreEqual_Passes()
    {
        var validator = new IsTeamMemberRequestValidator();
        var request = new IsTeamMemberRequest { ManagerUserId = 5, MemberUserId = 5 };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeTrue();
    }
}
