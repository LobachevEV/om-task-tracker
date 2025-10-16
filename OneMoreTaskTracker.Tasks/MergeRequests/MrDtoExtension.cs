using OneMoreTaskTracker.Tasks.MergeRequests;

namespace OneMoreTaskTracker.Proto.Clients.MergeRequests;

public partial class MrDto : IMrInfo
{
    private string[]? _labels;
    string[] IMrInfo.Labels => _labels ??= Labels.ToArray();
}
