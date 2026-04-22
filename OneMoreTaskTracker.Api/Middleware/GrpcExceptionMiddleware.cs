using System.Text.Json;
using Grpc.Core;

namespace OneMoreTaskTracker.Api.Middleware;

public class GrpcExceptionMiddleware(RequestDelegate next, ILogger<GrpcExceptionMiddleware> logger)
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (RpcException ex)
        {
            // Include the incoming request path + the gRPC status detail so an
            // operator can tell WHICH upstream call failed. Without this, a
            // sibling service being down (e.g. Features at :5110) surfaces as
            // an opaque 502 on the frontend and a generic log line that says
            // nothing about which endpoint was being served.
            logger.LogError(
                ex,
                "gRPC call failed with status {StatusCode} while serving {Method} {Path} (detail: {Detail})",
                ex.StatusCode,
                context.Request.Method,
                context.Request.Path,
                ex.Status.Detail);

            var (statusCode, message) = ex.StatusCode switch
            {
                StatusCode.InvalidArgument => (400, "Invalid request data"),
                StatusCode.FailedPrecondition => (422, "Precondition failed"),
                StatusCode.NotFound => (404, "Resource not found"),
                StatusCode.AlreadyExists => (409, "Resource already exists"),
                StatusCode.Unauthenticated => (401, "Authentication required"),
                StatusCode.PermissionDenied => (403, "Permission denied"),
                StatusCode.DeadlineExceeded => (504, "Request timed out"),
                StatusCode.ResourceExhausted => (429, "Too many requests"),
                StatusCode.Unavailable => (502, "Service temporarily unavailable"),
                _ => (502, "Service error")
            };

            context.Response.StatusCode = statusCode;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(
                JsonSerializer.Serialize(new { error = message }, JsonOptions));
        }
    }
}
