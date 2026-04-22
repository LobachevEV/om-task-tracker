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
        var task = new TaskEntity { Id = 1, JiraId = "TASK-1" }.WithFeature(1);

        task.AddProject(externalId: 100, name: "my-project");

        task.State.Should().Be((int)TaskState.InDev);
    }

    [Fact]
    public void AddProject_WhenInDev_StateUnchanged()
    {
        var task = new TaskEntity { Id = 1, JiraId = "TASK-1" }.WithFeature(1);
        task.AddProject(50, "initial-project");

        task.AddProject(externalId: 100, name: "my-project");

        task.State.Should().Be((int)TaskState.InDev);
    }

    [Fact]
    public void AddProject_WhenMrToRelease_StateUnchanged()
    {
        var task = new TaskEntity { Id = 1, JiraId = "TASK-1" }.WithFeature(1);
        task.AddMr(new FakeMrInfo(Iid: 5, TargetBranch: "release"));

        task.AddProject(externalId: 100, name: "my-project");

        task.State.Should().Be((int)TaskState.MrToRelease);
    }

    [Fact]
    public void AddProject_WhenMrToMaster_StateUnchanged()
    {
        var task = new TaskEntity { Id = 1, JiraId = "TASK-1" }.WithFeature(1);
        task.AddMr(new FakeMrInfo(Iid: 5, TargetBranch: "master"));

        task.AddProject(externalId: 100, name: "my-project");

        task.State.Should().Be((int)TaskState.MrToMaster);
    }

    [Fact]
    public void AddProject_AddsGitRepo_WhenNotPresent()
    {
        var task = new TaskEntity { Id = 1, JiraId = "TASK-1" }.WithFeature(1);

        task.AddProject(externalId: 100, name: "my-project");

        task.GitRepos.Should().HaveCount(1);
        task.GitRepos[0].ExternalId.Should().Be(100);
        task.GitRepos[0].Name.Should().Be("my-project");
    }

    [Fact]
    public void AddProject_DoesNotDuplicateGitRepo_WhenSameExternalId()
    {
        var task = new TaskEntity { Id = 1, JiraId = "TASK-1" }.WithFeature(1);

        task.AddProject(externalId: 100, name: "project-1");
        task.AddProject(externalId: 100, name: "project-2");

        task.GitRepos.Should().HaveCount(1);
    }

    [Fact]
    public void AddProject_StoresNameCorrectly()
    {
        var task = new TaskEntity { Id = 1, JiraId = "TASK-1" }.WithFeature(1);
        var projectName = "awesome-repo";

        task.AddProject(externalId: 200, name: projectName);

        task.GitRepos.Should().ContainSingle();
        task.GitRepos[0].Name.Should().Be(projectName);
    }
}
