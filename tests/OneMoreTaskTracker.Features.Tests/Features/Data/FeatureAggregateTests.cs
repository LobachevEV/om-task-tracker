using FluentAssertions;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Features.Features.Update;
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
    public void RenameTitle_AssignsTitle()
    {
        var feature = NewFeature();

        feature.RenameTitle("Renamed");

        feature.Title.Should().Be("Renamed");
    }

    [Fact]
    public void RenameTitle_RejectsNullTitle()
    {
        var feature = NewFeature();
        var act = () => feature.RenameTitle(null!);
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void SetDescription_AssignsDescription()
    {
        var feature = NewFeature();

        feature.SetDescription("new desc");

        feature.Description.Should().Be("new desc");
    }

    [Fact]
    public void SetDescription_AcceptsNull()
    {
        var feature = NewFeature();

        feature.SetDescription(null);

        feature.Description.Should().BeNull();
    }

    [Fact]
    public void AssignLead_AssignsLead()
    {
        var feature = NewFeature();

        feature.AssignLead(99);

        feature.LeadUserId.Should().Be(99);
    }

    private static FeatureGate NewGate() => new() { GateKey = "spec" };

    [Fact]
    public void ApplyStatusPatch_Approved_DelegatesToApprove()
    {
        var gate = NewGate();
        var now = new DateTime(2026, 4, 28, 17, 0, 0, DateTimeKind.Utc);

        gate.ApplyStatusPatch("approved", null, callerUserId: 7, now);

        gate.Status.Should().Be(GateStatus.Approved);
        gate.ApproverUserId.Should().Be(7);
        gate.ApprovedAtUtc.Should().Be(now);
    }

    [Fact]
    public void ApplyStatusPatch_Rejected_DelegatesToReject_AndTrimsReason()
    {
        var gate = NewGate();
        var now = new DateTime(2026, 4, 28, 17, 30, 0, DateTimeKind.Utc);

        gate.ApplyStatusPatch("rejected", "  needs more design  ", callerUserId: 9, now);

        gate.Status.Should().Be(GateStatus.Rejected);
        gate.RejectionReason.Should().Be("needs more design");
        gate.ApproverUserId.Should().Be(9);
    }

    [Fact]
    public void ApplyStatusPatch_Waiting_DelegatesToResetToWaiting()
    {
        var gate = NewGate();
        gate.Approve(1, new DateTime(2026, 4, 28, 17, 0, 0, DateTimeKind.Utc));
        var now = new DateTime(2026, 4, 28, 18, 0, 0, DateTimeKind.Utc);

        gate.ApplyStatusPatch("waiting", null, callerUserId: 0, now);

        gate.Status.Should().Be(GateStatus.Waiting);
        gate.ApproverUserId.Should().Be(0);
        gate.ApprovedAtUtc.Should().BeNull();
    }

    [Fact]
    public void ApplyStatusPatch_UnknownStatus_ThrowsInvalidGateStatusException()
    {
        var gate = NewGate();
        var act = () => gate.ApplyStatusPatch("done", null, callerUserId: 1, DateTime.UtcNow);

        act.Should().Throw<InvalidGateStatusException>().Which.Status.Should().Be("done");
    }
}
