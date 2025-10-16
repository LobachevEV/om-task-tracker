using Grpc.Core;
using OneMoreTaskTracker.GitLab.Proxy.MergeRequests;

namespace OneMoreTaskTracker.GitLab.Proxy.Services;

public partial class CreateMrHandler(ILogger<CreateMrHandler> logger, IGitLabApiClient apiClient) : MrCreator.MrCreatorBase
{
    public override async Task Create(
        IAsyncStreamReader<CreateMrRequest> requestStream,
        IServerStreamWriter<CreateMrResponse> responseStream,
        ServerCallContext context)
    {
        await foreach (var request in requestStream.ReadAllAsync())
        {
            var (success, resp) = await apiClient.Post(request.Uri, request.ToPostContent(), context.CancellationToken);
            var status = success ? CreateMrStatus.Success : CreateMrStatus.Fail;
            if (status is CreateMrStatus.Fail)
            {
                LogMrForProjectNameHasNotBeenCreated(logger, request.ProjectName, resp);
            }

            LogMrForProjectNameHasBeenCreated(logger, request.ProjectName);
            await responseStream.WriteAsync(new CreateMrResponse() { Status = status }, context.CancellationToken);
        }
    }

    [LoggerMessage(LogLevel.Debug, "MR for {projectName} has been created")]
    static partial void LogMrForProjectNameHasBeenCreated(ILogger<CreateMrHandler> logger, string projectName);

    [LoggerMessage(LogLevel.Debug, "MR for {projectName} has not been created. Response:\n{response}")]
    static partial void LogMrForProjectNameHasNotBeenCreated(
        ILogger<CreateMrHandler> logger,
        string projectName,
        string response);
}

public static class CreateMrExtension
{
    extension(CreateMrRequest request)
    {
        public Uri Uri => new($"projects/{request.ProjectId}/merge_requests", UriKind.Relative);
        public Dictionary<string, string> ToPostContent(bool removeSourceBranch = true, bool squash = true) => new()
        {
            ["source_branch"] = request.SourceBranch,
            ["target_branch"] = request.TargetBranch,
            ["title"] = request.Title,
            ["remove_source_branch"] = removeSourceBranch ? "true" : "false",
            ["squash"] = squash ? "true" : "false",
            ["labels"] = request.TargetBranch is "master" ? "release" : "develop"
        };
    }
}