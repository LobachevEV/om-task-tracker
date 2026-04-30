using System.Text.Json;

namespace OneMoreTaskTracker.Features.Features.Update;

internal static class ConflictDetail
{
    private const string Marker = "|conflict=";

    public static string VersionMismatch(int currentVersion) =>
        $"Updated by someone else{Marker}{JsonSerializer.Serialize(new
        {
            kind = "version",
            currentVersion
        })}";

    public static string SubStageOverlap(int subStageId, string neighbourSubStageId) =>
        $"Sub-stage order violation{Marker}{JsonSerializer.Serialize(new
        {
            kind = "subStageOverlap",
            subStageId,
            with = neighbourSubStageId
        })}";

    public static string SubStageCapReached(string track, string phase, int cap) =>
        $"Sub-stage cap reached{Marker}{JsonSerializer.Serialize(new
        {
            kind = "subStageCap",
            track,
            phase,
            cap
        })}";
}
