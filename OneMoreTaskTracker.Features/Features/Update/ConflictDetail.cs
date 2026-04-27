using System.Text.Json;

namespace OneMoreTaskTracker.Features.Features.Update;

// Wire format: "<publicMessage>|conflict={...json...}". The marker must stay in
// sync with GrpcExceptionMiddleware.ConflictMarker; clients without the
// extended envelope see only the leading publicMessage.
internal static class ConflictDetail
{
    private const string Marker = "|conflict=";

    public static string VersionMismatch(int currentVersion) =>
        $"Updated by someone else{Marker}{JsonSerializer.Serialize(new
        {
            kind = "version",
            currentVersion
        })}";

    public static string StageOrderOverlap(string neighbourStage) =>
        $"Stage order violation{Marker}{JsonSerializer.Serialize(new
        {
            kind = "overlap",
            with = neighbourStage
        })}";
}
