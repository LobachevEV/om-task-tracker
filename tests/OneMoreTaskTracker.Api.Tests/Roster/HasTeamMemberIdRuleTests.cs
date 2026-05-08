using FluentAssertions;
using FluentValidation;
using NSubstitute;
using OneMoreTaskTracker.Api.Roster;
using Xunit;

namespace OneMoreTaskTracker.Api.Tests.Roster;

public sealed class HasTeamMemberIdRuleTests
{
    private sealed record Payload(int? TeamMemberId) : IHasTeamMemberId;

    private static InlineValidator<Payload> BuildValidator(ITeamRosterProvider provider)
    {
        var v = new InlineValidator<Payload>();
        v.RuleFor(p => p.TeamMemberId).MustBeOnCallerRoster(provider);
        return v;
    }

    private static ValidationContext<Payload> ContextWith(Payload payload, int? callerUserId)
    {
        var ctx = new ValidationContext<Payload>(payload);
        if (callerUserId.HasValue)
            ctx.SetCallerUserId(callerUserId.Value);
        return ctx;
    }

    [Fact]
    public async Task MustBeOnCallerRoster_Passes_WhenTeamMemberIdIsNull()
    {
        var provider = Substitute.For<ITeamRosterProvider>();
        var validator = BuildValidator(provider);

        var result = await validator.ValidateAsync(ContextWith(new Payload(null), callerUserId: 1));

        result.IsValid.Should().BeTrue();
        await provider.DidNotReceive().IsTeamMemberAsync(Arg.Any<int>(), Arg.Any<int>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task MustBeOnCallerRoster_Fails_WhenCallerUserIdMissingFromContext()
    {
        var provider = Substitute.For<ITeamRosterProvider>();
        var validator = BuildValidator(provider);

        var result = await validator.ValidateAsync(ContextWith(new Payload(TeamMemberId: 5), callerUserId: null));

        result.IsValid.Should().BeFalse();
        result.Errors[0].ErrorMessage.Should().Be("Pick a teammate from the list");
        await provider.DidNotReceive().IsTeamMemberAsync(Arg.Any<int>(), Arg.Any<int>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task MustBeOnCallerRoster_Fails_WhenProviderReturnsFalse()
    {
        var provider = Substitute.For<ITeamRosterProvider>();
        provider.IsTeamMemberAsync(1, 5, Arg.Any<CancellationToken>()).Returns(false);
        var validator = BuildValidator(provider);

        var result = await validator.ValidateAsync(ContextWith(new Payload(TeamMemberId: 5), callerUserId: 1));

        result.IsValid.Should().BeFalse();
        result.Errors[0].ErrorMessage.Should().Be("Pick a teammate from the list");
    }

    [Fact]
    public async Task MustBeOnCallerRoster_Passes_WhenProviderReturnsTrue()
    {
        var provider = Substitute.For<ITeamRosterProvider>();
        provider.IsTeamMemberAsync(1, 5, Arg.Any<CancellationToken>()).Returns(true);
        var validator = BuildValidator(provider);

        var result = await validator.ValidateAsync(ContextWith(new Payload(TeamMemberId: 5), callerUserId: 1));

        result.IsValid.Should().BeTrue();
    }
}
