using Grpc.Core;
using OneMoreTaskTracker.GitLab.Proxy.Events;

namespace OneMoreTaskTracker.GitLab.Proxy.Services;

public class FindEventsHandler(IGitLabApiClient apiClient) : EventsFinder.EventsFinderBase
{
    public override async Task Find(
        FindEventsRequest request,
        IServerStreamWriter<FindEventsResponse> responseStream,
        ServerCallContext context)
    {
        var page = 1;
        while (true)
        {
            var gitlabEvents = await apiClient.GetMany<GitlabEvent>(request.Uri(page), context.CancellationToken).ToArrayAsync();

            if (gitlabEvents.Length == 0)
                return;

            foreach (var gitlabEvent in gitlabEvents.Where(dto
                         => dto is { Action: "created", TaskStage: "dev" } && dto.TaskName.StartsWith(request.TaskId)))
            {
                var dto = new EventDto
                    { Branch = gitlabEvent!.Branch, ProjectId = gitlabEvent.ProjectId, TaskName = gitlabEvent.TaskName };
                await responseStream.WriteAsync(new FindEventsResponse { Event = dto });
            }

            page++;
        }
    }
}

public static class EventsExtension
{
    extension(FindEventsRequest request)
    {
        public Uri Uri(int page)
            => new(
                $"users/{request.UserId}/events?after={request.SearchAfter.ToDateTime():O}&action=pushed&per_page=100&page={page}&sort=asc",
                UriKind.Relative);
    }
}

public record GitlabEvent(int ProjectId, PushData PushData)
{
    public PushData PushData { private get; init; } = PushData;
    public string Action => PushData.Action;
    public string Branch => PushData.Ref;
    public string TaskName => Branch.Split('/').First();
    public string TaskStage => Branch.Split('/').Last();
}

public record PushData(string Action, string Ref);