using Grpc.Core;
using OneMoreTaskTracker.Proto.Clients.MergeRequests;

namespace OneMoreTaskTracker.Tasks.MergeRequests;

public class MrsProvider(MrFinder.MrFinderClient mrFinder) : IMrsProvider
{
    public async IAsyncEnumerable<IMrInfo> Find(string search, string state,
        [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct = default)
    {
        var mrsCall = mrFinder.Find(new FindMrRequest
        {
            MrState = state,
            Search = search
        }, cancellationToken: ct);
        await foreach (var mrResponse in mrsCall.ResponseStream.ReadAllAsync(ct))
        {
            yield return mrResponse.Mr;
        }
    }
}
