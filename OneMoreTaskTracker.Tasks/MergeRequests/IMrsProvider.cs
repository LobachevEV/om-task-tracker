namespace OneMoreTaskTracker.Tasks.MergeRequests;

public interface IMrsProvider
{
    IAsyncEnumerable<IMrInfo> Find(string search, string state, CancellationToken ct = default);
}