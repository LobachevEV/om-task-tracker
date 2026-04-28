using FluentAssertions;
using OneMoreTaskTracker.Features.Features.Data;
using Xunit;

namespace OneMoreTaskTracker.Features.Tests.Features.Data;

public sealed class FeatureStagePlanAggregateTests
{
    private static FeatureStagePlan NewPlan() => new()
    {
        FeatureId = 1,
        Stage = (int)FeatureState.Development,
        PerformerUserId = 5,
        PlannedStart = new DateOnly(2026, 4, 1),
        PlannedEnd = new DateOnly(2026, 4, 30),
        Version = 3,
        UpdatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
    };

    [Fact]
    public void AssignOwner_AssignsPerformer_BumpsVersionByOne_AndStampsUpdatedAt()
    {
        var plan = NewPlan();
        var versionBefore = plan.Version;
        var now = new DateTime(2026, 4, 28, 10, 0, 0, DateTimeKind.Utc);

        plan.AssignOwner(42, now);

        plan.PerformerUserId.Should().Be(42);
        plan.Version.Should().Be(versionBefore + 1);
        plan.UpdatedAt.Should().Be(now);
    }

    [Fact]
    public void AssignOwner_AcceptsZeroAsUnassigned()
    {
        var plan = NewPlan();
        var versionBefore = plan.Version;
        var now = new DateTime(2026, 4, 28, 11, 0, 0, DateTimeKind.Utc);

        plan.AssignOwner(0, now);

        plan.PerformerUserId.Should().Be(0);
        plan.Version.Should().Be(versionBefore + 1);
        plan.UpdatedAt.Should().Be(now);
    }

    [Fact]
    public void SetPlannedStart_AssignsDate_BumpsVersionByOne_AndStampsUpdatedAt()
    {
        var plan = NewPlan();
        var versionBefore = plan.Version;
        var now = new DateTime(2026, 4, 28, 12, 0, 0, DateTimeKind.Utc);
        var newStart = new DateOnly(2026, 5, 1);

        plan.SetPlannedStart(newStart, now);

        plan.PlannedStart.Should().Be(newStart);
        plan.Version.Should().Be(versionBefore + 1);
        plan.UpdatedAt.Should().Be(now);
    }

    [Fact]
    public void SetPlannedStart_AcceptsNull()
    {
        var plan = NewPlan();
        var versionBefore = plan.Version;
        var now = new DateTime(2026, 4, 28, 13, 0, 0, DateTimeKind.Utc);

        plan.SetPlannedStart(null, now);

        plan.PlannedStart.Should().BeNull();
        plan.Version.Should().Be(versionBefore + 1);
        plan.UpdatedAt.Should().Be(now);
    }

    [Fact]
    public void SetPlannedEnd_AssignsDate_BumpsVersionByOne_AndStampsUpdatedAt()
    {
        var plan = NewPlan();
        var versionBefore = plan.Version;
        var now = new DateTime(2026, 4, 28, 14, 0, 0, DateTimeKind.Utc);
        var newEnd = new DateOnly(2026, 6, 1);

        plan.SetPlannedEnd(newEnd, now);

        plan.PlannedEnd.Should().Be(newEnd);
        plan.Version.Should().Be(versionBefore + 1);
        plan.UpdatedAt.Should().Be(now);
    }

    [Fact]
    public void SetPlannedEnd_AcceptsNull()
    {
        var plan = NewPlan();
        var versionBefore = plan.Version;
        var now = new DateTime(2026, 4, 28, 15, 0, 0, DateTimeKind.Utc);

        plan.SetPlannedEnd(null, now);

        plan.PlannedEnd.Should().BeNull();
        plan.Version.Should().Be(versionBefore + 1);
        plan.UpdatedAt.Should().Be(now);
    }

    [Fact]
    public void Touch_StampsUpdatedAt_WithoutBumpingVersion()
    {
        var plan = NewPlan();
        var versionBefore = plan.Version;
        var now = new DateTime(2026, 4, 28, 16, 0, 0, DateTimeKind.Utc);

        plan.Touch(now);

        plan.UpdatedAt.Should().Be(now);
        plan.Version.Should().Be(versionBefore);
    }

    [Fact]
    public void AssignOwner_DoesNotMutateOtherFields()
    {
        var plan = NewPlan();
        var startBefore = plan.PlannedStart;
        var endBefore = plan.PlannedEnd;
        var stageBefore = plan.Stage;

        plan.AssignOwner(99, DateTime.UtcNow);

        plan.PlannedStart.Should().Be(startBefore);
        plan.PlannedEnd.Should().Be(endBefore);
        plan.Stage.Should().Be(stageBefore);
    }
}
