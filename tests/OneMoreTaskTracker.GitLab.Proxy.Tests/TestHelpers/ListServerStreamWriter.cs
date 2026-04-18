using Grpc.Core;

namespace OneMoreTaskTracker.GitLab.Proxy.Tests.TestHelpers;

internal sealed class ListServerStreamWriter<T> : IServerStreamWriter<T>
{
    private readonly List<T> _responses = [];

    public WriteOptions? WriteOptions { get; set; }

    public Task WriteAsync(T message)
    {
        _responses.Add(message);
        return Task.CompletedTask;
    }

    public Task WriteAsync(T message, CancellationToken cancellationToken)
    {
        _responses.Add(message);
        return Task.CompletedTask;
    }

    public IReadOnlyList<T> Responses => _responses;
}
