using System.Text.Json;
using Grpc.Core;

namespace OneMoreTaskTracker.Api.Tests.Infra;

internal static class GrpcTestHelpers
{
    public static AsyncUnaryCall<T> UnaryCall<T>(T response) =>
        new(Task.FromResult(response),
            Task.FromResult(new Metadata()),
            () => new Status(StatusCode.OK, string.Empty),
            () => new Metadata(),
            () => { });

    public static AsyncServerStreamingCall<T> StreamingCall<T>(T response) =>
        StreamingCallFrom(new[] { response }.ToAsyncEnumerable());

    public static AsyncServerStreamingCall<T> EmptyStreamingCall<T>() =>
        StreamingCallFrom(AsyncEnumerable.Empty<T>());

    public static async Task<T?> ReadAsAsync<T>(HttpContent content)
    {
        var json = await content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<T>(json,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
    }

    private static AsyncServerStreamingCall<T> StreamingCallFrom<T>(IAsyncEnumerable<T> source) =>
        new(new AsyncEnumerableAdapter<T>(source),
            Task.FromResult(new Metadata()),
            () => new Status(StatusCode.OK, string.Empty),
            () => new Metadata(),
            () => { });
}

internal sealed class AsyncEnumerableAdapter<T>(IAsyncEnumerable<T> enumerable) : IAsyncStreamReader<T>
{
    private readonly IAsyncEnumerator<T> _enumerator = enumerable.GetAsyncEnumerator();

    public T Current => _enumerator.Current;

    public async Task<bool> MoveNext(CancellationToken cancellationToken)
    {
        return await _enumerator.MoveNextAsync();
    }

    public void Dispose()
    {
    }
}
