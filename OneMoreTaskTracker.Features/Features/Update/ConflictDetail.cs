using System.Text.Json;

namespace OneMoreTaskTracker.Features.Features.Update;

// Encodes the extra conflict context the gateway surfaces as the contract's
// `conflict` object. Keep the format aligned with
// OneMoreTaskTracker.Api/Middleware/GrpcExceptionMiddleware.cs ConflictMarker.
//
// Format: "<publicMessage>|conflict={\"kind\":\"version\",\"currentVersion\":3}"
// Clients unaware of the extended envelope see only the publicMessage via the
// gateway's fallback path.
internal static class ConflictDetail
{
    private const string Marker = "|conflict=";

    public static string VersionMismatch(int currentVersion) =>
        $"Updated by someone else{Marker}{JsonSerializer.Serialize(new
        {
            kind = "version",
            currentVersion
        })}";

    // Cross-stage chronological-order violation. The neighbour stage name
    // (canonical PascalCase) is what the FE renders inline as
    // "Overlaps with {with}" — see api-contract.md § "Error Envelope" and the
    // 422 row in backend-eval-contract.md §4.
    public static string StageOrderOverlap(string neighbourStage) =>
        $"Stage order violation{Marker}{JsonSerializer.Serialize(new
        {
            kind = "overlap",
            with = neighbourStage
        })}";
}
