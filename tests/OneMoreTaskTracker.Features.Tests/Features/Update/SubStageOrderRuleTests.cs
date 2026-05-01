using FluentAssertions;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Features.Features.Update;
using Xunit;

namespace OneMoreTaskTracker.Features.Tests.Features.Update;

public sealed class SubStageOrderRuleTests
{
    private static FeatureSubStage Sibling(short ordinal, string start, string end)
    {
        var sub = new FeatureSubStage
        {
            Track = Track.Backend,
            PhaseKind = PhaseKind.Development,
        };
        sub.SeedOrdinal(ordinal);
        sub.SeedDates(DateOnly.Parse(start), DateOnly.Parse(end));
        return sub;
    }

    [Fact]
    public void NullDates_ReturnsNull()
    {
        var others = new[] { Sibling(1, "2026-05-01", "2026-05-10") };

        SubStageOrderRule.FindOverlappingNeighbor(others, null, null).Should().BeNull();
        SubStageOrderRule.FindOverlappingNeighbor(others, DateOnly.Parse("2026-05-12"), null).Should().BeNull();
        SubStageOrderRule.FindOverlappingNeighbor(others, null, DateOnly.Parse("2026-05-12")).Should().BeNull();
    }

    [Fact]
    public void AdjacentIntervals_AreNotOverlapping()
    {
        var others = new[] { Sibling(1, "2026-05-01", "2026-05-10") };

        SubStageOrderRule.FindOverlappingNeighbor(others, DateOnly.Parse("2026-05-10"), DateOnly.Parse("2026-05-15"))
            .Should().BeNull();
    }

    [Fact]
    public void OverlappingIntervals_ReturnsNeighborOrdinal()
    {
        var others = new[]
        {
            Sibling(1, "2026-05-01", "2026-05-10"),
            Sibling(2, "2026-05-20", "2026-05-25"),
        };

        SubStageOrderRule.FindOverlappingNeighbor(others, DateOnly.Parse("2026-05-09"), DateOnly.Parse("2026-05-12"))
            .Should().Be(1);
    }

    [Fact]
    public void CandidateContainedInsideSibling_ReturnsNeighbor()
    {
        var others = new[] { Sibling(3, "2026-05-01", "2026-05-30") };

        SubStageOrderRule.FindOverlappingNeighbor(others, DateOnly.Parse("2026-05-10"), DateOnly.Parse("2026-05-15"))
            .Should().Be(3);
    }

    [Fact]
    public void SiblingWithoutDates_IsIgnored()
    {
        var dateless = new FeatureSubStage { Track = Track.Backend, PhaseKind = PhaseKind.Development };
        dateless.SeedOrdinal(2);

        var others = new[]
        {
            dateless,
            Sibling(3, "2026-05-20", "2026-05-25"),
        };

        SubStageOrderRule.FindOverlappingNeighbor(others, DateOnly.Parse("2026-05-01"), DateOnly.Parse("2026-05-10"))
            .Should().BeNull();
    }

    [Fact]
    public void Reordering_NonOverlapping_ReturnsNull()
    {
        var others = new[]
        {
            Sibling(1, "2026-05-01", "2026-05-05"),
            Sibling(3, "2026-05-20", "2026-05-25"),
        };

        SubStageOrderRule.FindOverlappingNeighbor(others, DateOnly.Parse("2026-05-10"), DateOnly.Parse("2026-05-15"))
            .Should().BeNull();
    }
}
