using Grpc.Core;
using OneMoreTaskTracker.Proto.Features.CreateFeatureCommand;

namespace OneMoreTaskTracker.Features.Features.Create;

public class CreateFeatureHandler : FeatureCreator.FeatureCreatorBase
{
    public override Task<FeatureDto> Create(CreateFeatureRequest request, ServerCallContext context)
        => throw new RpcException(new Status(StatusCode.Unimplemented, "see spec 03"));
}
