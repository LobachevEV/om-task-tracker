using Grpc.Core;
using OneMoreTaskTracker.Features.Features.Data;

namespace OneMoreTaskTracker.Features.Features.Update;

public static class FeatureVersionGuard
{
    public static void EnsureFeatureVersion(Feature feature, bool hasExpected, int expectedVersion)
    {
        if (hasExpected && expectedVersion != feature.Version)
            throw new RpcException(new Status(StatusCode.AlreadyExists, ConflictDetail.VersionMismatch(feature.Version)));
    }

    public static void EnsureGateVersion(FeatureGate gate, bool hasExpected, int expectedVersion)
    {
        if (hasExpected && expectedVersion != gate.Version)
            throw new RpcException(new Status(StatusCode.AlreadyExists, ConflictDetail.VersionMismatch(gate.Version)));
    }

    public static void EnsureSubStageVersion(FeatureSubStage subStage, bool hasExpected, int expectedVersion)
    {
        if (hasExpected && expectedVersion != subStage.Version)
            throw new RpcException(new Status(StatusCode.AlreadyExists, ConflictDetail.VersionMismatch(subStage.Version)));
    }
}
