using Grpc.Core;
using OneMoreTaskTracker.Proto.Features.UpdateFeatureCommand;

namespace OneMoreTaskTracker.Features.Features.Update;

public class UpdateFeatureHandler : FeatureUpdater.FeatureUpdaterBase
{
    public override Task<FeatureDto> Update(UpdateFeatureRequest request, ServerCallContext context)
        => throw new RpcException(new Status(StatusCode.Unimplemented, "see spec 03"));
}
