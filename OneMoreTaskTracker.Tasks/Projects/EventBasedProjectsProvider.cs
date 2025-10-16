using Google.Protobuf.WellKnownTypes;
using Grpc.Core;
using OneMoreTaskTracker.Proto.Clients.Events;
using OneMoreTaskTracker.Proto.Clients.Projects;

namespace OneMoreTaskTracker.Tasks.Projects;

public class EventBasedProjectsProvider(
    EventsFinder.EventsFinderClient eventsFinder,
    ProjectGetter.ProjectGetterClient projectGetter)
    : IProjectsProvider
{
    public async IAsyncEnumerable<ProjectDto> Get(int userId, string taskId, Timestamp firstPushDate)
    {
        var eventsCall = eventsFinder.Find(new FindEventsRequest
        {
            UserId = userId,
            TaskId = taskId,
            Action = "pushed",
            SearchAfter = firstPushDate
        });
        await foreach (var eventResponse in eventsCall.ResponseStream.ReadAllAsync())
        {
            var eventDto = eventResponse.Event;
            if (eventDto == null)
            {
                continue;
            }

            var projectResponse = await projectGetter.GetAsync(new GetProjectQuery
            {
                Id = eventDto.ProjectId
            });
            yield return projectResponse.Project;
        }
    }
}