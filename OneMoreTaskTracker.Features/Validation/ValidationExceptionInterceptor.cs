using FluentValidation;
using Grpc.Core;
using Grpc.Core.Interceptors;

namespace OneMoreTaskTracker.Features.Validation;

public sealed class ValidationExceptionInterceptor(IServiceProvider serviceProvider) : Interceptor
{
    public override async Task<TResponse> UnaryServerHandler<TRequest, TResponse>(
        TRequest request,
        ServerCallContext context,
        UnaryServerMethod<TRequest, TResponse> continuation)
    {
        await ValidateAsync(request, context.CancellationToken);
        return await continuation(request, context);
    }

    public override async Task ServerStreamingServerHandler<TRequest, TResponse>(
        TRequest request,
        IServerStreamWriter<TResponse> responseStream,
        ServerCallContext context,
        ServerStreamingServerMethod<TRequest, TResponse> continuation)
    {
        await ValidateAsync(request, context.CancellationToken);
        await continuation(request, responseStream, context);
    }

    private async Task ValidateAsync<TRequest>(TRequest request, CancellationToken cancellationToken)
        where TRequest : class
    {
        var validator = serviceProvider.GetService<IValidator<TRequest>>();
        if (validator is null)
            return;

        var result = await validator.ValidateAsync(request, cancellationToken);
        if (result.IsValid)
            return;

        var statusCode = result.Errors
            .Select(f => f.CustomState as StatusCode?)
            .FirstOrDefault(s => s.HasValue) ?? StatusCode.InvalidArgument;

        throw new RpcException(new Status(statusCode, ValidationDetailComposer.Compose(result.Errors)));
    }
}
