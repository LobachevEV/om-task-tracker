using FluentAssertions;
using Grpc.Core;
using NSubstitute;
using OneMoreTaskTracker.GitLab.Proxy.Services;
using OneMoreTaskTracker.Projects;
using Xunit;

namespace OneMoreTaskTracker.GitLab.Proxy.Tests.Services;

public class GetProjectHandlerTests
{
    [Fact]
    public async Task Get_WithValidProjectId_ReturnsProjectResponse()
    {
        // Arrange
        var apiClient = Substitute.For<IGitLabApiClient>();
        var handler = new GetProjectHandler(apiClient);

        var gitlabProject = new GitLabProjectDto(Id: 123, Name: "Test Project");
        apiClient.GetOne<GitLabProjectDto>(Arg.Any<Uri>(), Arg.Any<CancellationToken>())
            .Returns(gitlabProject);

        var request = new GetProjectQuery { Id = 123 };
        var context = Substitute.For<ServerCallContext>();
        context.CancellationToken.Returns(CancellationToken.None);

        // Act
        var response = await handler.Get(request, context);

        // Assert
        response.Should().NotBeNull();
        response.Project.Should().NotBeNull();
        response.Project.Id.Should().Be(123);
        response.Project.Name.Should().Be("Test Project");
    }

    [Fact]
    public async Task Get_WithNullProject_ReturnsResponseWithNullProject()
    {
        // Arrange
        var apiClient = Substitute.For<IGitLabApiClient>();
        var handler = new GetProjectHandler(apiClient);

        apiClient.GetOne<GitLabProjectDto>(Arg.Any<Uri>(), Arg.Any<CancellationToken>())
            .Returns((GitLabProjectDto?)null);

        var request = new GetProjectQuery { Id = 999 };
        var context = Substitute.For<ServerCallContext>();
        context.CancellationToken.Returns(CancellationToken.None);

        // Act
        var response = await handler.Get(request, context);

        // Assert
        response.Should().NotBeNull();
        response.Project.Should().BeNull();
    }

    [Fact]
    public async Task Get_CallsApiClientWithCorrectUri()
    {
        // Arrange
        var apiClient = Substitute.For<IGitLabApiClient>();
        var handler = new GetProjectHandler(apiClient);

        var gitlabProject = new GitLabProjectDto(Id: 456, Name: "Another Project");
        apiClient.GetOne<GitLabProjectDto>(Arg.Any<Uri>(), Arg.Any<CancellationToken>())
            .Returns(gitlabProject);

        var request = new GetProjectQuery { Id = 456 };
        var context = Substitute.For<ServerCallContext>();
        context.CancellationToken.Returns(CancellationToken.None);

        // Act
        await handler.Get(request, context);

        // Assert
        apiClient.Received(1).GetOne<GitLabProjectDto>(
            Arg.Is<Uri>(u => u.ToString() == "projects/456"),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Get_PassesCancellationToken()
    {
        // Arrange
        var apiClient = Substitute.For<IGitLabApiClient>();
        var handler = new GetProjectHandler(apiClient);

        var gitlabProject = new GitLabProjectDto(Id: 789, Name: "Test");
        apiClient.GetOne<GitLabProjectDto>(Arg.Any<Uri>(), Arg.Any<CancellationToken>())
            .Returns(gitlabProject);

        var request = new GetProjectQuery { Id = 789 };
        var cts = new CancellationTokenSource();
        var context = Substitute.For<ServerCallContext>();
        context.CancellationToken.Returns(cts.Token);

        // Act
        await handler.Get(request, context);

        // Assert
        apiClient.Received(1).GetOne<GitLabProjectDto>(
            Arg.Any<Uri>(),
            Arg.Is(cts.Token));
    }

    [Fact]
    public async Task Get_WithDifferentProjectIds_BuildsCorrectUris()
    {
        // Arrange
        var apiClient = Substitute.For<IGitLabApiClient>();
        var handler = new GetProjectHandler(apiClient);

        var project = new GitLabProjectDto(Id: 111, Name: "Project");
        apiClient.GetOne<GitLabProjectDto>(Arg.Any<Uri>(), Arg.Any<CancellationToken>())
            .Returns(project);

        var context = Substitute.For<ServerCallContext>();
        context.CancellationToken.Returns(CancellationToken.None);

        // Act
        var request1 = new GetProjectQuery { Id = 100 };
        _ = await handler.Get(request1, context);

        var request2 = new GetProjectQuery { Id = 200 };
        _ = await handler.Get(request2, context);

        var request3 = new GetProjectQuery { Id = 300 };
        _ = await handler.Get(request3, context);

        // Assert
        apiClient.Received(1).GetOne<GitLabProjectDto>(
            Arg.Is<Uri>(u => u.ToString() == "projects/100"),
            Arg.Any<CancellationToken>());
        apiClient.Received(1).GetOne<GitLabProjectDto>(
            Arg.Is<Uri>(u => u.ToString() == "projects/200"),
            Arg.Any<CancellationToken>());
        apiClient.Received(1).GetOne<GitLabProjectDto>(
            Arg.Is<Uri>(u => u.ToString() == "projects/300"),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Get_PreservesProjectMetadata()
    {
        // Arrange
        var apiClient = Substitute.For<IGitLabApiClient>();
        var handler = new GetProjectHandler(apiClient);

        var gitlabProject = new GitLabProjectDto(Id: 555, Name: "Important Project Name");
        apiClient.GetOne<GitLabProjectDto>(Arg.Any<Uri>(), Arg.Any<CancellationToken>())
            .Returns(gitlabProject);

        var request = new GetProjectQuery { Id = 555 };
        var context = Substitute.For<ServerCallContext>();
        context.CancellationToken.Returns(CancellationToken.None);

        // Act
        var response = await handler.Get(request, context);

        // Assert
        response.Project.Id.Should().Be(555);
        response.Project.Name.Should().Be("Important Project Name");
    }
}
