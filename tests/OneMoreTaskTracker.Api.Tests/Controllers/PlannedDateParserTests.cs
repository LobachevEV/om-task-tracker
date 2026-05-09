using FluentAssertions;
using NSubstitute;
using OneMoreTaskTracker.Api.Controllers.Plan;
using OneMoreTaskTracker.Api.Controllers.Plan.Feature;
using OneMoreTaskTracker.Api.Roster;
using Xunit;

namespace OneMoreTaskTracker.Api.Tests.Controllers;

public sealed class PlannedDateParserTests
{
    [Fact]
    public void TryParseIsoDate_ReturnsTrue_OnValidYyyyMmDd()
    {
        var ok = PlanRequestHelpers.TryParseIsoDate("2026-01-31", out var date);

        ok.Should().BeTrue();
        date.Should().Be(new DateOnly(2026, 1, 31));
    }

    [Fact]
    public void TryParseIsoDate_ReturnsFalse_OnNullOrWhitespace()
    {
        PlanRequestHelpers.TryParseIsoDate(null, out _).Should().BeFalse();
        PlanRequestHelpers.TryParseIsoDate("", out _).Should().BeFalse();
        PlanRequestHelpers.TryParseIsoDate("   ", out _).Should().BeFalse();
    }

    [Theory]
    [InlineData("2026/01/31")]
    [InlineData("31-01-2026")]
    [InlineData("2026-1-31")]
    [InlineData("not-a-date")]
    public void TryParseIsoDate_ReturnsFalse_OnNonIsoFormats(string raw)
    {
        PlanRequestHelpers.TryParseIsoDate(raw, out _).Should().BeFalse();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("2026-04-29")]
    public void Validator_Passes_OnMissingOrValidPlannedStart(string? raw)
    {
        var payload = new UpdateFeaturePayload(CsApprovingPlannedStart: raw);

        var result = new UpdateFeaturePayloadValidator(Substitute.For<ITeamRosterProvider>()).Validate(payload);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validator_ReportsFormatError_OnUnparseablePlannedStart()
    {
        var payload = new UpdateFeaturePayload(CsApprovingPlannedStart: "31/01/2026");

        var result = new UpdateFeaturePayloadValidator(Substitute.For<ITeamRosterProvider>()).Validate(payload);

        result.IsValid.Should().BeFalse();
        result.Errors[0].ErrorMessage.Should().Be("Date must be YYYY-MM-DD");
    }

    [Theory]
    [InlineData("1999-12-31")]
    [InlineData("2101-01-01")]
    public void Validator_ReportsRangeError_OnOutOfWindowYear(string raw)
    {
        var payload = new UpdateFeaturePayload(CsApprovingPlannedStart: raw);

        var result = new UpdateFeaturePayloadValidator(Substitute.For<ITeamRosterProvider>()).Validate(payload);

        result.IsValid.Should().BeFalse();
        result.Errors[0].ErrorMessage.Should().Be("Use a real release date");
    }

    [Fact]
    public void Validator_AlsoChecksPlannedEnd()
    {
        var payload = new UpdateFeaturePayload(CsApprovingPlannedEnd: "31/01/2026");

        var result = new UpdateFeaturePayloadValidator(Substitute.For<ITeamRosterProvider>()).Validate(payload);

        result.IsValid.Should().BeFalse();
        result.Errors[0].ErrorMessage.Should().Be("Date must be YYYY-MM-DD");
    }
}
