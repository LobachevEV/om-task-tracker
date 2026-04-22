using FluentAssertions;
using OneMoreTaskTracker.Proto.Tasks;
using TaskEntity = OneMoreTaskTracker.Tasks.Tasks.Data.Task;
using OneMoreTaskTracker.Tasks.Tests.TestHelpers;
using Xunit;

namespace OneMoreTaskTracker.Tasks.Tests.Tasks.Data;

public sealed class TaskAddMrTests
{
    [Fact]
    public void AddMr_WhenNotStartedAndTargetIsMaster_SetsStateMrToMaster()
    {
        var task = new TaskEntity { Id = 1, JiraId = "TASK-1", FeatureId = 1 };
        var mr = new FakeMrInfo(Iid: 10, TargetBranch: "master");

        task.AddMr(mr);

        task.State.Should().Be((int)TaskState.MrToMaster);
    }

    [Fact]
    public void AddMr_WhenNotStartedAndTargetIsNotMaster_SetsStateMrToRelease()
    {
        var task = new TaskEntity { Id = 1, JiraId = "TASK-1", FeatureId = 1 };
        var mr = new FakeMrInfo(Iid: 10, TargetBranch: "release");

        task.AddMr(mr);

        task.State.Should().Be((int)TaskState.MrToRelease);
    }

    [Fact]
    public void AddMr_WhenMrToMasterAndTargetIsNotMaster_SetsStateMrToRelease()
    {
        var task = new TaskEntity { Id = 1, JiraId = "TASK-1", FeatureId = 1 };
        task.AddMr(new FakeMrInfo(Iid: 5, TargetBranch: "master"));

        var mr = new FakeMrInfo(Iid: 10, TargetBranch: "release");

        task.AddMr(mr);

        task.State.Should().Be((int)TaskState.MrToRelease);
    }

    [Fact]
    public void AddMr_WhenMrToRelease_StateUnchanged()
    {
        var task = new TaskEntity { Id = 1, JiraId = "TASK-1", FeatureId = 1 };
        task.AddMr(new FakeMrInfo(Iid: 5, TargetBranch: "release"));

        var mr = new FakeMrInfo(Iid: 10, TargetBranch: "master");

        task.AddMr(mr);

        task.State.Should().Be((int)TaskState.MrToRelease);
    }

    [Fact]
    public void AddMr_WhenInDev_StateUnchanged()
    {
        var task = new TaskEntity { Id = 1, JiraId = "TASK-1", FeatureId = 1 };
        task.AddProject(100, "some-project");

        var mr = new FakeMrInfo(Iid: 10, TargetBranch: "master");

        task.AddMr(mr);

        task.State.Should().Be((int)TaskState.InDev);
    }

    [Fact]
    public void AddMr_WhenMrToMasterAndTargetIsMaster_StateUnchanged()
    {
        var task = new TaskEntity { Id = 1, JiraId = "TASK-1", FeatureId = 1 };
        task.AddMr(new FakeMrInfo(Iid: 10, TargetBranch: "master"));

        var mr = new FakeMrInfo(Iid: 20, TargetBranch: "master");

        task.AddMr(mr);

        task.State.Should().Be((int)TaskState.MrToMaster);
    }

    [Fact]
    public void AddMr_DuplicateIid_IsIgnored()
    {
        var task = new TaskEntity { Id = 1, JiraId = "TASK-1", FeatureId = 1 };
        var mr1 = new FakeMrInfo(Iid: 10, TargetBranch: "master");
        var mr2 = new FakeMrInfo(Iid: 10, TargetBranch: "release");

        task.AddMr(mr1);
        var stateAfterFirst = task.State;
        task.AddMr(mr2);
        var stateAfterSecond = task.State;

        task.MergeRequests.Should().HaveCount(1);
        stateAfterFirst.Should().Be((int)TaskState.MrToMaster);
        stateAfterSecond.Should().Be((int)TaskState.MrToMaster);
    }

    [Fact]
    public void AddMr_AddsGitRepo_WhenRepoNotPresent()
    {
        var task = new TaskEntity { Id = 1, JiraId = "TASK-1", FeatureId = 1 };
        var mr = new FakeMrInfo(Iid: 10, ProjectId: 42, ProjectName: "my-repo");

        task.AddMr(mr);

        task.GitRepos.Should().HaveCount(1);
        task.GitRepos[0].ExternalId.Should().Be(42);
        task.GitRepos[0].Name.Should().Be("my-repo");
    }

    [Fact]
    public void AddMr_DoesNotDuplicateGitRepo_WhenSameProjectId()
    {
        var task = new TaskEntity { Id = 1, JiraId = "TASK-1", FeatureId = 1 };
        var mr1 = new FakeMrInfo(Iid: 10, ProjectId: 42, ProjectName: "repo-1");
        var mr2 = new FakeMrInfo(Iid: 20, ProjectId: 42, ProjectName: "repo-2");

        task.AddMr(mr1);
        task.AddMr(mr2);

        task.GitRepos.Should().HaveCount(1);
        task.GitRepos[0].ExternalId.Should().Be(42);
    }

    [Fact]
    public void AddMr_StoresMrFields_Correctly()
    {
        var task = new TaskEntity { Id = 1, JiraId = "TASK-1", FeatureId = 1 };
        var labels = new[] { "bug", "feature" };
        var mr = new FakeMrInfo(
            Iid: 99,
            ProjectId: 55,
            Title: "Fix authentication bug",
            Labels: labels);

        task.AddMr(mr);

        task.MergeRequests.Should().HaveCount(1);
        var addedMr = task.MergeRequests[0];
        addedMr.ExternalId.Should().Be(99);
        addedMr.ExternalProjectId.Should().Be(55);
        addedMr.Title.Should().Be("Fix authentication bug");
        addedMr.Labels.Should().BeEquivalentTo(labels);
    }
}
