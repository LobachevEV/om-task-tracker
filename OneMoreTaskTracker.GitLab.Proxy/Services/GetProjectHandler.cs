using Grpc.Core;
using OneMoreTaskTracker.Projects;

namespace OneMoreTaskTracker.GitLab.Proxy.Services;

public class GetProjectHandler(IGitLabApiClient apiClient) : ProjectGetter.ProjectGetterBase
{
    public override async Task<GetProjectResponse> Get(
        GetProjectQuery request,
        ServerCallContext context)
    {
        var project = await apiClient.GetOne<GitLabProjectDto>(request.Uri, context.CancellationToken);
        return new GetProjectResponse
        {
            Project = ProjectDto.FromProject(project)
        };
    }
}

public static class ProjectGetterExtensions
{
    extension(GetProjectQuery request)
    {
        public Uri Uri => new($"projects/{request.Id}", UriKind.Relative);
    }

    extension(ProjectDto dto)
    {
        public static ProjectDto? FromProject(GitLabProjectDto? project) => project is null ? null : new ProjectDto
        {
            Id = project.Id,
            Name = project.Name
        };
    }
}

public record GitLabProjectDto(int Id, string Name);