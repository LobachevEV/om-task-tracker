using Grpc.Core;

namespace OneMoreTaskTracker.Features.Features.Data;

// Shared validation helpers for Create and Update handlers (spec 03 §51–63).
public static class FeatureValidation
{
    public static DateOnly? ParseOptionalDate(string raw, string field)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        if (!DateOnly.TryParseExact(raw, "yyyy-MM-dd", out var d))
            throw new RpcException(new Status(StatusCode.InvalidArgument, $"{field} must be YYYY-MM-DD"));
        return d;
    }

    public static void ValidateDateOrder(DateOnly? start, DateOnly? end)
    {
        if (start is { } s && end is { } e && e < s)
            throw new RpcException(new Status(StatusCode.InvalidArgument, "planned_end must be on or after planned_start"));
    }
}
