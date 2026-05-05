using FluentAssertions;
using NSubstitute;
using OneMoreTaskTracker.Api.Controllers.Plan.Feature;
using OneMoreTaskTracker.Api.Controllers.Plan.Feature.Rosters;
using Xunit;

namespace OneMoreTaskTracker.Api.Tests.Controllers.Plan.Feature.Rosters;

public sealed class TeammateRosterValidatorTests
{
    private const int CallerUserId = 7;
    private const int RosterMemberId = 11;

    private sealed record StubPayload(int? TeammateUserId) : IHasTeammateUserId;

    [Fact]
    public async Task Validate_IsValid_WhenTeammateIdIsNull()
    {
        var rosterProvider = Substitute.For<ITeamRosterProvider>();
        var sut = new TeammateRosterValidator(rosterProvider);

        var result = await sut.ValidateAsync(
            TeammateValidationContext.ForCaller(new StubPayload(null), CallerUserId));

        result.IsValid.Should().BeTrue();
        await rosterProvider
            .DidNotReceive()
            .IsTeammateOfManagerAsync(Arg.Any<int>(), Arg.Any<int>(), Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task Validate_IsInvalid_WithInvalidRequest_WhenTeammateIdIsNotPositive(int teammateId)
    {
        var rosterProvider = Substitute.For<ITeamRosterProvider>();
        var sut = new TeammateRosterValidator(rosterProvider);

        var result = await sut.ValidateAsync(
            TeammateValidationContext.ForCaller(new StubPayload(teammateId), CallerUserId));

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle()
            .Which.ErrorMessage.Should().Be("Invalid request data");
        await rosterProvider
            .DidNotReceive()
            .IsTeammateOfManagerAsync(Arg.Any<int>(), Arg.Any<int>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Validate_IsInvalid_WithPickATeammate_WhenProviderReportsNotMember()
    {
        var rosterProvider = Substitute.For<ITeamRosterProvider>();
        rosterProvider
            .IsTeammateOfManagerAsync(CallerUserId, RosterMemberId, Arg.Any<CancellationToken>())
            .Returns(false);
        var sut = new TeammateRosterValidator(rosterProvider);

        var result = await sut.ValidateAsync(
            TeammateValidationContext.ForCaller(new StubPayload(RosterMemberId), CallerUserId));

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle()
            .Which.ErrorMessage.Should().Be(TeammateRosterValidator.PickATeammateError);
    }

    [Fact]
    public async Task Validate_IsValid_WhenProviderReportsMember()
    {
        var rosterProvider = Substitute.For<ITeamRosterProvider>();
        rosterProvider
            .IsTeammateOfManagerAsync(CallerUserId, RosterMemberId, Arg.Any<CancellationToken>())
            .Returns(true);
        var sut = new TeammateRosterValidator(rosterProvider);

        var result = await sut.ValidateAsync(
            TeammateValidationContext.ForCaller(new StubPayload(RosterMemberId), CallerUserId));

        result.IsValid.Should().BeTrue();
    }
}
