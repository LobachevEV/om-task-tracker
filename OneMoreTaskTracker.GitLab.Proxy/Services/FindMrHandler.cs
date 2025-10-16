using Grpc.Core;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.ObjectPool;
using OneMoreTaskTracker.GitLab.Proxy.MergeRequests;
using System.Text;

namespace OneMoreTaskTracker.GitLab.Proxy.Services;

public class FindMrHandler(IGitLabApiClient apiClient) : MrFinder.MrFinderBase
{
    public override async Task Find(
        FindMrRequest request,
        IServerStreamWriter<FindMrResponse> responseStream,
        ServerCallContext context)
    {
        await foreach (var mrDto in apiClient.GetMany<MrDto>(request.Uri, context.CancellationToken))
        {
            await responseStream.WriteAsync(new FindMrResponse() { Mr = mrDto }, context.CancellationToken);
        }
    }
}

public static class FindMrExtension
{
    extension(FindMrRequest request)
    {
        public Uri Uri
        {
            get
            {
                var queryParams = new Dictionary<string, string?>()
                {
                    ["scope"] = "all",
                    ["state"] = request.MrState,
                    ["search"] = request.Search,
                    ["per_page"] = "40"
                };
                if (request.Labels.Count != 0)
                {
                    queryParams.Add("labels", string.Join(",", request.Labels));
                }

                return new Uri(QueryHelpers.AddQueryString("merge_requests", queryParams), UriKind.Relative);
            }
        }
    }
}