using FluentValidation;
using Grpc.Core;
using OneMoreTaskTracker.Features.Validation;

namespace OneMoreTaskTracker.Features.Tests.TestHelpers;

public static class ValidationPipeline
{
    public static async Task ValidateAsync<TRequest>(
        IValidator<TRequest> validator,
        TRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await validator.ValidateAsync(request, cancellationToken);
        if (result.IsValid)
            return;

        var statusCode = result.Errors
            .Select(f => f.CustomState as StatusCode?)
            .FirstOrDefault(s => s.HasValue) ?? StatusCode.InvalidArgument;

        throw new RpcException(new Status(statusCode, ValidationDetailComposer.Compose(result.Errors)));
    }
}
