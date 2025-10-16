namespace OneMoreTaskTracker.GitLab.Proxy;

public interface IGitLabApiClient : IDisposable
{
    Task<TDto?> GetOne<TDto>(Uri uri, CancellationToken cancellationToken);

    IAsyncEnumerable<TDto?> GetMany<TDto>(Uri uri, CancellationToken cancellationToken);

    Task<(bool Ok, string Response)> Post(
        Uri uri,
        IReadOnlyDictionary<string, string>? content,
        CancellationToken contextCancellationToken);

    Task<(bool Ok, string Response)> Post(Uri uri, CancellationToken cancellationToken);

    Task<Result<TResponse>> Put<TResponse>(Uri uri, CancellationToken cancellationToken);
}