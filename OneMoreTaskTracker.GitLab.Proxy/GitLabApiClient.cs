using System.Text.Json;

namespace OneMoreTaskTracker.GitLab.Proxy;

public sealed class GitLabApiClient(HttpClient httpClient) : IGitLabApiClient
{
    private static readonly JsonSerializerOptions options = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
    };

    public Task<TDto?> GetOne<TDto>(Uri uri, CancellationToken cancellationToken)
        => httpClient.GetFromJsonAsync<TDto>(uri, options, cancellationToken: cancellationToken);

    public IAsyncEnumerable<TDto?> GetMany<TDto>(Uri uri, CancellationToken cancellationToken)
        => httpClient.GetFromJsonAsAsyncEnumerable<TDto>(uri, options, cancellationToken: cancellationToken);

    public async Task<(bool Ok, string Response)> Post(
        Uri uri,
        IReadOnlyDictionary<string, string>? content,
        CancellationToken cancellationToken)
    {
        var resp = await httpClient.PostAsync(uri,
            content == null ? null : new FormUrlEncodedContent(content),
            cancellationToken);
        var respText = await resp.Content.ReadAsStringAsync(cancellationToken);
        var ok = resp.IsSuccessStatusCode && respText.Contains("\"id\"");
        return (ok, respText);
    }

    public Task<(bool Ok, string Response)> Post(Uri uri, CancellationToken cancellationToken)
        => Post(uri, null, cancellationToken);

    public async Task<Result<TResponse>> Put<TResponse>(Uri uri, CancellationToken cancellationToken)
    {
        var responseMessage = await httpClient.PutAsync(uri, null, cancellationToken);
        if (!responseMessage.IsSuccessStatusCode)
            return responseMessage.ReasonPhrase ?? await responseMessage.Content.ReadAsStringAsync(cancellationToken);

        return (await responseMessage.Content.ReadFromJsonAsync<TResponse>(options, cancellationToken))!;
    }

    public void Dispose()
    {
        httpClient.Dispose();
    }
}