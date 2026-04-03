using FluentAssertions;
using OneMoreTaskTracker.Proto.Tasks;
using TaskEntity = OneMoreTaskTracker.Tasks.Tasks.Data.Task;
using OneMoreTaskTracker.Tasks.Tests.TestHelpers;
using Xunit;

namespace OneMoreTaskTracker.Tasks.Tests.Tasks.Data;

public sealed class TaskAddProjectTests
{
    [Fact]
    public void AddProject_WhenNotStarted_SetsStateInDev()
    {
        // Arrange
        var task = new TaskEntity { Id = 1, JiraId = "TASK-1" };

        // Act
        task.AddProject(externalId: 100, name: "my-project");

        // Assert
        task.State.Should().Be((int)TaskState.InDev);
    }

    [Fact]
    public void AddProject_WhenInDev_StateUnchanged()
    {
        // Arrange
        var task = new TaskEntity { Id = 1, JiraId = "TASK-1" };
        // Set up task to be in InDev state
        task.AddProject(50, "initial-project");

        // Act
        task.AddProject(externalId: 100, name: "my-project");

        // Assert
        task.State.Should().Be((int)TaskState.InDev);
    }

    [Fact]
    public void AddProject_WhenMrToRelease_StateUnchanged()
    {
        // Arrange
        var task = new TaskEntity { Id = 1, JiraId = "TASK-1" };
        // Set up task to be in MrToRelease state
        var mr = new FakeMrInfo(Iid: 5, TargetBranch: "release");
        task.AddMr(mr);

        // Act
        task.AddProject(externalId: 100, name: "my-project");

        // Assert
        task.State.Should().Be((int)TaskState.MrToRelease);
    }

    [Fact]
    public void AddProject_WhenMrToMaster_StateUnchanged()
    {
        // Arrange
        var task = new TaskEntity { Id = 1, JiraId = "TASK-1" };
        // Set up task to be in MrToMaster state
        var mr = new FakeMrInfo(Iid: 5, TargetBranch: "master");
        task.AddMr(mr);

        // Act
        task.AddProject(externalId: 100, name: "my-project");

        // Assert
        task.State.Should().Be((int)TaskState.MrToMaster);
    }

    [Fact]
    public void AddProject_AddsGitRepo_WhenNotPresent()
    {
        // Arrange
        var task = new TaskEntity { Id = 1, JiraId = "TASK-1" };

        // Act
        task.AddProject(externalId: 100, name: "my-project");

        // Assert
        task.GitRepos.Should().HaveCount(1);
        task.GitRepos[0].ExternalId.Should().Be(100);
        task.GitRepos[0].Name.Should().Be("my-project");
    }

    [Fact]
    public void AddProject_DoesNotDuplicateGitRepo_WhenSameExternalId()
    {
        // Arrange
        var task = new TaskEntity { Id = 1, JiraId = "TASK-1" };

        // Act
        task.AddProject(externalId: 100, name: "project-1");
        task.AddProject(externalId: 100, name: "project-2");

        // Assert
        task.GitRepos.Should().HaveCount(1);
    }

    [Fact]
    public void AddProject_StoresNameCorrectly()
    {
        // Arrange
        var task = new TaskEntity { Id = 1, JiraId = "TASK-1" };
        var projectName = "awesome-repo";

        // Act
        task.AddProject(externalId: 200, name: projectName);

        // Assert
        task.GitRepos.Should().ContainSingle();
        task.GitRepos[0].Name.Should().Be(projectName);
    }
}
