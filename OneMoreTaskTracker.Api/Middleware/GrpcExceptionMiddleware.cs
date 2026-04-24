using System.Text.Json;
using Grpc.Core;

namespace OneMoreTaskTracker.Api.Middleware;

public class GrpcExceptionMiddleware(RequestDelegate next, ILogger<GrpcExceptionMiddleware> logger)
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    // Handlers in the Features service encode extra conflict context after a
    // pipe delimiter in Status.Detail so the gateway can surface it as the
    // contract-declared `conflict` object (api-contract.md § "Error Envelope").
    // Example detail payloads:
    //   "Updated by someone else|conflict={\"kind\":\"version\",\"currentVersion\":3}"
    //   "Stage order violation|conflict={\"kind\":\"overlap\",\"with\":\"Development\"}"
    private const string ConflictMarker = "|conflict=";

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

            var (publicMessage, conflict) = ExtractConflict(ex.Status.Detail, ex.StatusCode, message);

            context.Response.StatusCode = statusCode;
            context.Response.ContentType = "application/json";

            object body = conflict is null
                ? new { error = publicMessage }
                : new { error = publicMessage, conflict };

            await context.Response.WriteAsync(JsonSerializer.Serialize(body, JsonOptions));
        }
    }

    // Returns (publicMessage, conflictObject?). The handler-provided detail
    // is ONLY surfaced to the public body when the ConflictMarker is present
    // (i.e. the handler explicitly opted into the extended envelope via
    // ConflictDetail). For all other details we keep the generic mapping
    // message so we never leak raw internal error text — microservices/
    // security.md § "Error surface leaks".
    private static (string publicMessage, object? conflict) ExtractConflict(
        string detail, StatusCode code, string fallbackMessage)
    {
        if (string.IsNullOrEmpty(detail))
            return (fallbackMessage, null);

        var markerIndex = detail.IndexOf(ConflictMarker, StringComparison.Ordinal);
        if (markerIndex < 0)
            return (fallbackMessage, null);

        var publicPart = detail[..markerIndex];
        var jsonPart = detail[(markerIndex + ConflictMarker.Length)..];

        var resolvedMessage = string.IsNullOrWhiteSpace(publicPart) ? fallbackMessage : publicPart;

        // Only AlreadyExists (version conflict) and FailedPrecondition (stage
        // overlap/order/rangeInvalid) carry a contract-declared conflict
        // envelope. For other status codes a marker is a misuse — ignore it.
        if (code != StatusCode.AlreadyExists && code != StatusCode.FailedPrecondition)
            return (fallbackMessage, null);

        try
        {
            var conflict = JsonSerializer.Deserialize<Dictionary<string, object?>>(jsonPart, JsonOptions);
            return (resolvedMessage, conflict);
        }
        catch (JsonException)
        {
            // Malformed conflict JSON — keep the public message but drop the
            // object rather than failing the whole response. Operators see the
            // raw detail in the structured log line above.
            return (resolvedMessage, null);
        }
    }
}
