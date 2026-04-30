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

    public static void EnsureStageVersion(FeatureStagePlan plan, bool hasExpected, int expectedStageVersion)
    {
        if (hasExpected && expectedStageVersion != plan.Version)
            throw new RpcException(new Status(StatusCode.AlreadyExists, ConflictDetail.VersionMismatch(plan.Version)));
    }
}
