using Grpc.Core;
using Grpc.Core.Interceptors;
using OneMoreTaskTracker.Features.Features.Update;

namespace OneMoreTaskTracker.Features.Validation;

public sealed class DomainExceptionInterceptor : Interceptor
{
    public override async Task<TResponse> UnaryServerHandler<TRequest, TResponse>(
        TRequest request,
        ServerCallContext context,
        UnaryServerMethod<TRequest, TResponse> continuation)
    {
        try
        {
            return await continuation(request, context);
        }
        catch (OptimisticConcurrencyConflictException ex)
        {
            throw new RpcException(new Status(StatusCode.AlreadyExists, ConflictDetail.VersionMismatch(ex.CurrentVersion)));
        }
        catch (FeatureNotFoundException ex)
        {
            throw new RpcException(new Status(StatusCode.NotFound, ex.Message));
        }
        catch (InvalidGateStatusException)
        {
            throw new RpcException(new Status(StatusCode.InvalidArgument, "status must be approved|rejected|waiting"));
        }
    }

    public override async Task ServerStreamingServerHandler<TRequest, TResponse>(
        TRequest request,
        IServerStreamWriter<TResponse> responseStream,
        ServerCallContext context,
        ServerStreamingServerMethod<TRequest, TResponse> continuation)
    {
        try
        {
            await continuation(request, responseStream, context);
        }
        catch (OptimisticConcurrencyConflictException ex)
        {
            throw new RpcException(new Status(StatusCode.AlreadyExists, ConflictDetail.VersionMismatch(ex.CurrentVersion)));
        }
        catch (FeatureNotFoundException ex)
        {
            throw new RpcException(new Status(StatusCode.NotFound, ex.Message));
        }
        catch (InvalidGateStatusException)
        {
            throw new RpcException(new Status(StatusCode.InvalidArgument, "status must be approved|rejected|waiting"));
        }
    }
}
