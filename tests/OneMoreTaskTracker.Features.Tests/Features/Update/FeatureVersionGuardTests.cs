using FluentAssertions;
using Grpc.Core;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Features.Features.Update;
using Xunit;

namespace OneMoreTaskTracker.Features.Tests.Features.Update;

public sealed class FeatureVersionGuardTests
{
    [Fact]
    public void EnsureFeatureVersion_WithoutExpected_DoesNotThrow()
    {
        var feature = new Feature { Title = "X", Version = 5 };

        var act = () => FeatureVersionGuard.EnsureFeatureVersion(feature, hasExpected: false, expectedVersion: 0);

        act.Should().NotThrow();
    }

    [Fact]
    public void EnsureFeatureVersion_WhenExpectedMatches_DoesNotThrow()
    {
        var feature = new Feature { Title = "X", Version = 5 };

        var act = () => FeatureVersionGuard.EnsureFeatureVersion(feature, hasExpected: true, expectedVersion: 5);

        act.Should().NotThrow();
    }

    [Fact]
    public void EnsureFeatureVersion_WhenExpectedMismatches_ThrowsAlreadyExistsWithCurrentVersion()
    {
        var feature = new Feature { Title = "X", Version = 9 };

        var act = () => FeatureVersionGuard.EnsureFeatureVersion(feature, hasExpected: true, expectedVersion: 1);

        var ex = act.Should().Throw<RpcException>().Which;
        ex.StatusCode.Should().Be(StatusCode.AlreadyExists);
        ex.Status.Detail.Should().StartWith("Updated by someone else");
        ex.Status.Detail.Should().Contain("|conflict=");
        ex.Status.Detail.Should().Contain("\"kind\":\"version\"");
        ex.Status.Detail.Should().Contain("\"currentVersion\":9");
    }

    [Fact]
    public void EnsureStageVersion_WithoutExpected_DoesNotThrow()
    {
        var plan = new FeatureStagePlan { Version = 3 };

        var act = () => FeatureVersionGuard.EnsureStageVersion(plan, hasExpected: false, expectedStageVersion: 0);

        act.Should().NotThrow();
    }

    [Fact]
    public void EnsureStageVersion_WhenExpectedMatches_DoesNotThrow()
    {
        var plan = new FeatureStagePlan { Version = 3 };

        var act = () => FeatureVersionGuard.EnsureStageVersion(plan, hasExpected: true, expectedStageVersion: 3);

        act.Should().NotThrow();
    }

    [Fact]
    public void EnsureStageVersion_WhenExpectedMismatches_ThrowsAlreadyExistsWithStageVersion()
    {
        var plan = new FeatureStagePlan { Version = 4 };

        var act = () => FeatureVersionGuard.EnsureStageVersion(plan, hasExpected: true, expectedStageVersion: 1);

        var ex = act.Should().Throw<RpcException>().Which;
        ex.StatusCode.Should().Be(StatusCode.AlreadyExists);
        ex.Status.Detail.Should().Contain("\"currentVersion\":4");
        ex.Status.Detail.Should().Contain("\"kind\":\"version\"");
    }
}
