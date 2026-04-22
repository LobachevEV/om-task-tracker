using Grpc.Core;
using OneMoreTaskTracker.Proto.Features.GetFeatureQuery;

namespace OneMoreTaskTracker.Features.Features.Get;

public class GetFeatureHandler : FeatureGetter.FeatureGetterBase
{
    public override Task<FeatureDto> Get(GetFeatureRequest request, ServerCallContext context)
        => throw new RpcException(new Status(StatusCode.Unimplemented, "see spec 04"));
}
