using Grpc.Core;
using OneMoreTaskTracker.GitLab.Proxy.Branches;

namespace OneMoreTaskTracker.GitLab.Proxy.Services;

public partial class CreateBranchHandler(ILogger<CreateBranchHandler> logger, IGitLabApiClient apiClient)
    : BranchesCreator.BranchesCreatorBase
{
    public override async Task Create(
        IAsyncStreamReader<CreateBranchRequest> requestStream,
        IServerStreamWriter<CreateBranchResponse> responseStream,
        ServerCallContext context)
    {
        await foreach (var request in requestStream.ReadAllAsync(context.CancellationToken))
        {
            var (success, response) = await apiClient.Post(request.Uri, context.CancellationToken);
            var status = success ? CreateBranchStatus.Success : CreateBranchStatus.Fail;
            if (status is CreateBranchStatus.Fail)
                LogFailedToCreateABranchResponse(logger, request.ProjectId, request.BranchName, response);

            await responseStream.WriteAsync(new CreateBranchResponse() { Status = status }, context.CancellationToken);
        }
    }

    [LoggerMessage(LogLevel.Error, "Failed to create a branch {projectId}/{branchName} {response}")]
    static partial void LogFailedToCreateABranchResponse(
        ILogger<CreateBranchHandler> logger,
        int projectId,
        string branchName,
        string response);
}

public static class BranchesExtension
{
    extension(CreateBranchRequest request)
    {
        public Uri Uri
            => new(
                $"/projects/{request.ProjectId}/repository/branches?branch={Uri.EscapeDataString(request.BranchName)}&ref={request.BaseBranch}",
                UriKind.Relative);
    }
}