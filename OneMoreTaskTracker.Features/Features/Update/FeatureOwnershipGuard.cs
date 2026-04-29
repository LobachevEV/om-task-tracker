using Grpc.Core;
using OneMoreTaskTracker.Features.Features.Data;

namespace OneMoreTaskTracker.Features.Features.Update;

public static class FeatureOwnershipGuard
{
    public static void EnsureManager(Feature feature, int callerUserId)
    {
        if (callerUserId <= 0 || feature.ManagerUserId != callerUserId)
            throw new RpcException(new Status(StatusCode.PermissionDenied, "Not the feature owner"));
    }
}
