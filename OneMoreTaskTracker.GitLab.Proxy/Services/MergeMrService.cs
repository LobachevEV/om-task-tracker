using Grpc.Core;
using OneMoreTaskTracker.GitLab.Proxy.MergeRequests;

namespace OneMoreTaskTracker.GitLab.Proxy.Services;

public partial class MergeMrService(ILogger<MergeMrService> logger, IGitLabApiClient apiClient) : MrMerger.MrMergerBase
{
    public override async Task Merge(
        IAsyncStreamReader<MergeMrRequest> requestStream,
        IServerStreamWriter<MergeMrResponse> responseStream,
        ServerCallContext context)
    {
        await foreach (var request in requestStream.ReadAllAsync())
        {
            var result = await apiClient.Put<MergeResult>(request.Uri, context.CancellationToken);
            var status = result is not { IsSuccess: true, Dto.Id: not 0 } ? MergeMrStatus.Fail : MergeMrStatus.Success;
            if (status is MergeMrStatus.Fail)
            {
                LogMrForProjectIdHasNotBeenMerged(logger, request.ProjectId, result.Message);
            }

            LogMrForReferenceHasBeenMerged(logger, result.Dto!.References.Full);
            await responseStream.WriteAsync(new MergeMrResponse() { Status = status }, context.CancellationToken);
        }
    }

    [LoggerMessage(LogLevel.Debug, "MR for {reference} has been merged")]
    static partial void LogMrForReferenceHasBeenMerged(ILogger<MergeMrService> logger, string reference);

    [LoggerMessage(LogLevel.Debug, "MR for {projectId} has not been merged. Message: {message}")]
    static partial void LogMrForProjectIdHasNotBeenMerged(ILogger<MergeMrService> logger, int projectId, string? message);
}

public record MergeResult(int Id, References References);

public record References(string Full);

public static class MergeMrExtensions
{
    extension(MergeMrRequest request)
    {
        public Uri Uri => new($"projects/{request.ProjectId}/merge_requests/{request.MrId}/merge", UriKind.Relative);
    }
}