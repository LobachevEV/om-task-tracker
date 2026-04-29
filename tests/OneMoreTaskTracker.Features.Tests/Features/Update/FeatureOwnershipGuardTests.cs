using FluentAssertions;
using Grpc.Core;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Features.Features.Update;
using Xunit;

namespace OneMoreTaskTracker.Features.Tests.Features.Update;

public sealed class FeatureOwnershipGuardTests
{
    [Fact]
    public void EnsureManager_WhenCallerMatchesManager_DoesNotThrow()
    {
        var feature = new Feature { Title = "X", ManagerUserId = 7 };

        var act = () => FeatureOwnershipGuard.EnsureManager(feature, callerUserId: 7);

        act.Should().NotThrow();
    }

    [Fact]
    public void EnsureManager_WhenCallerIsZero_ThrowsPermissionDenied()
    {
        var feature = new Feature { Title = "X", ManagerUserId = 7 };

        var act = () => FeatureOwnershipGuard.EnsureManager(feature, callerUserId: 0);

        var ex = act.Should().Throw<RpcException>().Which;
        ex.StatusCode.Should().Be(StatusCode.PermissionDenied);
        ex.Status.Detail.Should().Be("Not the feature owner");
    }

    [Fact]
    public void EnsureManager_WhenCallerIsNegative_ThrowsPermissionDenied()
    {
        var feature = new Feature { Title = "X", ManagerUserId = 7 };

        var act = () => FeatureOwnershipGuard.EnsureManager(feature, callerUserId: -1);

        act.Should().Throw<RpcException>()
            .Which.StatusCode.Should().Be(StatusCode.PermissionDenied);
    }

    [Fact]
    public void EnsureManager_WhenCallerDiffersFromManager_ThrowsPermissionDenied()
    {
        var feature = new Feature { Title = "X", ManagerUserId = 7 };

        var act = () => FeatureOwnershipGuard.EnsureManager(feature, callerUserId: 8);

        act.Should().Throw<RpcException>()
            .Which.StatusCode.Should().Be(StatusCode.PermissionDenied);
    }
}
