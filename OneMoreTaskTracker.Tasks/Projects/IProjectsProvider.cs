using Google.Protobuf.WellKnownTypes;
using OneMoreTaskTracker.Proto.Clients.Projects;

namespace OneMoreTaskTracker.Tasks.Projects;

public interface IProjectsProvider
{
    IAsyncEnumerable<ProjectDto> Get(int userId, string taskId, Timestamp firstPushDate);
}