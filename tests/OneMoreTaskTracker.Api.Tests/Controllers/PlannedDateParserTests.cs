using FluentAssertions;
using OneMoreTaskTracker.Api.Controllers.Plan;
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

    [Fact]
    public void ValidateOptionalReleaseDate_ReturnsNull_OnMissingOrValidValue()
    {
        PlanMapper.ValidateOptionalReleaseDate(null).Should().BeNull();
        PlanMapper.ValidateOptionalReleaseDate("").Should().BeNull();
        PlanMapper.ValidateOptionalReleaseDate("2026-04-29").Should().BeNull();
    }

    [Fact]
    public void ValidateOptionalReleaseDate_ReportsFormatError_OnUnparseableDate()
    {
        PlanMapper.ValidateOptionalReleaseDate("31/01/2026").Should().Be("Date must be YYYY-MM-DD");
    }

    [Fact]
    public void ValidateOptionalReleaseDate_ReportsRangeError_OnOutOfWindowYear()
    {
        PlanMapper.ValidateOptionalReleaseDate("1999-12-31").Should().Be("Use a real release date");
        PlanMapper.ValidateOptionalReleaseDate("2101-01-01").Should().Be("Use a real release date");
    }
}
