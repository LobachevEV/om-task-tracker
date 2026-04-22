using Grpc.Core;
using OneMoreTaskTracker.Proto.Features.ListFeaturesQuery;

namespace OneMoreTaskTracker.Features.Features.List;

public class ListFeaturesHandler : FeaturesLister.FeaturesListerBase
{
    public override Task<ListFeaturesResponse> List(ListFeaturesRequest request, ServerCallContext context)
        => throw new RpcException(new Status(StatusCode.Unimplemented, "see spec 04"));
}
