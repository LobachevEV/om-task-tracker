using Grpc.Core;

namespace OneMoreTaskTracker.GitLab.Proxy.Tests.TestHelpers;

internal sealed class QueueAsyncStreamReader<T>(params T[] items) : IAsyncStreamReader<T>
{
    private readonly Queue<T> _items = new(items);

    public T Current { get; private set; } = default!;

    public Task<bool> MoveNext(CancellationToken cancellationToken)
    {
        if (_items.Count == 0)
            return Task.FromResult(false);

        Current = _items.Dequeue();
        return Task.FromResult(true);
    }

    public void Dispose() { }
}
