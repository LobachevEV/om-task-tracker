using FluentAssertions;
using OneMoreTaskTracker.Features.Features.Data;
using Xunit;

namespace OneMoreTaskTracker.Features.Tests.Features.Data;

public sealed class FeatureAggregateTests
{
    private static Feature NewFeature() => new()
    {
        Title = "Original",
        Description = "desc",
        LeadUserId = 1,
        ManagerUserId = 2,
    };

    [Fact]
    public void RenameTitle_AssignsTitle_BumpsVersionByOne_AndStampsUpdatedAt()
    {
        var feature = NewFeature();
        var versionBefore = feature.Version;
        var now = new DateTime(2026, 4, 28, 10, 0, 0, DateTimeKind.Utc);

        feature.RenameTitle("Renamed", now);

        feature.Title.Should().Be("Renamed");
        feature.Version.Should().Be(versionBefore + 1);
        feature.UpdatedAt.Should().Be(now);
    }

    [Fact]
    public void RenameTitle_RejectsNullTitle()
    {
        var feature = NewFeature();
        var act = () => feature.RenameTitle(null!, DateTime.UtcNow);
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void SetDescription_AssignsDescription_BumpsVersionByOne_AndStampsUpdatedAt()
    {
        var feature = NewFeature();
        var versionBefore = feature.Version;
        var now = new DateTime(2026, 4, 28, 11, 0, 0, DateTimeKind.Utc);

        feature.SetDescription("new desc", now);

        feature.Description.Should().Be("new desc");
        feature.Version.Should().Be(versionBefore + 1);
        feature.UpdatedAt.Should().Be(now);
    }

    [Fact]
    public void SetDescription_AcceptsNull()
    {
        var feature = NewFeature();
        var versionBefore = feature.Version;
        var now = new DateTime(2026, 4, 28, 12, 0, 0, DateTimeKind.Utc);

        feature.SetDescription(null, now);

        feature.Description.Should().BeNull();
        feature.Version.Should().Be(versionBefore + 1);
        feature.UpdatedAt.Should().Be(now);
    }

    [Fact]
    public void AssignLead_AssignsLead_BumpsVersionByOne_AndStampsUpdatedAt()
    {
        var feature = NewFeature();
        var versionBefore = feature.Version;
        var now = new DateTime(2026, 4, 28, 13, 0, 0, DateTimeKind.Utc);

        feature.AssignLead(99, now);

        feature.LeadUserId.Should().Be(99);
        feature.Version.Should().Be(versionBefore + 1);
        feature.UpdatedAt.Should().Be(now);
    }

    [Fact]
    public void RecordGateFlip_BumpsVersionByOne_AndStampsUpdatedAt_WithoutChangingFields()
    {
        var feature = NewFeature();
        var versionBefore = feature.Version;
        var titleBefore = feature.Title;
        var leadBefore = feature.LeadUserId;
        var now = new DateTime(2026, 4, 28, 14, 0, 0, DateTimeKind.Utc);

        feature.RecordGateFlip(now);

        feature.Version.Should().Be(versionBefore + 1);
        feature.UpdatedAt.Should().Be(now);
        feature.Title.Should().Be(titleBefore);
        feature.LeadUserId.Should().Be(leadBefore);
    }

    [Fact]
    public void RecordSubStageMutation_BumpsVersionByOne_AndStampsUpdatedAt_WithoutChangingFields()
    {
        var feature = NewFeature();
        var versionBefore = feature.Version;
        var titleBefore = feature.Title;
        var leadBefore = feature.LeadUserId;
        var now = new DateTime(2026, 4, 28, 14, 30, 0, DateTimeKind.Utc);

        feature.RecordSubStageMutation(now);

        feature.Version.Should().Be(versionBefore + 1);
        feature.UpdatedAt.Should().Be(now);
        feature.Title.Should().Be(titleBefore);
        feature.LeadUserId.Should().Be(leadBefore);
    }

    [Fact]
    public void Touch_StampsUpdatedAt_WithoutBumpingVersion()
    {
        var feature = NewFeature();
        var versionBefore = feature.Version;
        var now = new DateTime(2026, 4, 28, 15, 0, 0, DateTimeKind.Utc);

        feature.Touch(now);

        feature.UpdatedAt.Should().Be(now);
        feature.Version.Should().Be(versionBefore);
    }

    [Fact]
    public void RenameTitle_TwoCalls_BumpVersionByTwo()
    {
        var feature = NewFeature();
        var versionBefore = feature.Version;
        var now = new DateTime(2026, 4, 28, 16, 0, 0, DateTimeKind.Utc);

        feature.RenameTitle("First", now);
        feature.RenameTitle("Second", now.AddSeconds(1));

        feature.Version.Should().Be(versionBefore + 2);
        feature.Title.Should().Be("Second");
    }
}
