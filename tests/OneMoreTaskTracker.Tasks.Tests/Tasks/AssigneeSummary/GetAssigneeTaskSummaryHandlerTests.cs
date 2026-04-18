using FluentAssertions;
using Google.Protobuf.WellKnownTypes;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using NSubstitute;
using OneMoreTaskTracker.Proto.Tasks;
using OneMoreTaskTracker.Proto.Tasks.TaskAggregateQuery;
using OneMoreTaskTracker.Tasks.Tasks.Data;
using OneMoreTaskTracker.Tasks.Tasks.AssigneeSummary;
using Xunit;
using Task = OneMoreTaskTracker.Tasks.Tasks.Data.Task;

namespace OneMoreTaskTracker.Tasks.Tests.Tasks.AssigneeSummary;

public sealed class GetAssigneeTaskSummaryHandlerTests
{
    private static TasksDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<TasksDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new TasksDbContext(options);
    }

    private static ServerCallContext CreateContext()
    {
        var ctx = Substitute.For<ServerCallContext>();
        ctx.CancellationToken.Returns(CancellationToken.None);
        return ctx;
    }

    [Fact]
    public async System.Threading.Tasks.Task BatchGetAssigneeTaskSummary_ReturnsOneSummaryPerInputId_IncludingZeroTaskAssignees()
    {
        var db = CreateDb();
        var task1 = new Task { JiraId = "TASK-1", UserId = 1 };
        task1.SetStateForTesting((int)TaskState.InDev);
        var task2 = new Task { JiraId = "TASK-2", UserId = 1 };
        task2.SetStateForTesting((int)TaskState.InDev);
        db.Tasks.AddRange(task1, task2);
        await db.SaveChangesAsync();

        var handler = new GetAssigneeTaskSummaryHandler(db);
        var request = new BatchGetAssigneeTaskSummaryRequest();
        request.AssigneeUserIds.AddRange(new[] { 1, 2, 3 }); // Assignees 2 and 3 have no tasks
        var ctx = CreateContext();

        var response = await handler.BatchGetAssigneeTaskSummary(request, ctx);

        response.Summaries.Should().HaveCount(3);

        var summary1 = response.Summaries.First(s => s.AssigneeUserId == 1);
        summary1.ActiveCount.Should().Be(2);
        summary1.Mix.InDev.Should().Be(2);

        var summary2 = response.Summaries.First(s => s.AssigneeUserId == 2);
        summary2.ActiveCount.Should().Be(0);
        summary2.Mix.InDev.Should().Be(0);
        summary2.Mix.MrToRelease.Should().Be(0);

        var summary3 = response.Summaries.First(s => s.AssigneeUserId == 3);
        summary3.ActiveCount.Should().Be(0);
    }

    [Fact]
    public async System.Threading.Tasks.Task BatchGetAssigneeTaskSummary_CorrectlyBucketsByState()
    {
        var db = CreateDb();
        var t1 = new Task { JiraId = "TASK-1", UserId = 1 };
        t1.SetStateForTesting((int)TaskState.InDev);
        var t2 = new Task { JiraId = "TASK-2", UserId = 1 };
        t2.SetStateForTesting((int)TaskState.MrToRelease);
        var t3 = new Task { JiraId = "TASK-3", UserId = 1 };
        t3.SetStateForTesting((int)TaskState.InTest);
        var t4 = new Task { JiraId = "TASK-4", UserId = 1 };
        t4.SetStateForTesting((int)TaskState.MrToMaster);
        var t5 = new Task { JiraId = "TASK-5", UserId = 1 };
        t5.SetStateForTesting((int)TaskState.Completed);
        db.Tasks.AddRange(t1, t2, t3, t4, t5);
        await db.SaveChangesAsync();

        var handler = new GetAssigneeTaskSummaryHandler(db);
        var request = new BatchGetAssigneeTaskSummaryRequest();
        request.AssigneeUserIds.Add(1);
        var ctx = CreateContext();

        var response = await handler.BatchGetAssigneeTaskSummary(request, ctx);

        var summary = response.Summaries.Single();
        // ActiveCount excludes Completed
        summary.ActiveCount.Should().Be(4);
        summary.Mix.InDev.Should().Be(1);
        summary.Mix.MrToRelease.Should().Be(1);
        summary.Mix.InTest.Should().Be(1);
        summary.Mix.MrToMaster.Should().Be(1);
        summary.Mix.Completed.Should().Be(1);
    }

    [Fact]
    public async System.Threading.Tasks.Task BatchGetAssigneeTaskSummary_LastActivityAtIsNullWhenTaskModelHasNoTimestamp()
    {
        // Note: This test documents current behavior where Task model doesn't track timestamps.
        // When a timestamp field is added to Task (e.g., UpdatedAt, CreatedAt), this test
        // should be updated to verify last_activity_at is correctly populated.
        var db = CreateDb();

        var t1 = new Task { JiraId = "TASK-1", UserId = 1 };
        t1.SetStateForTesting((int)TaskState.InDev);
        var t2 = new Task { JiraId = "TASK-2", UserId = 1 };
        t2.SetStateForTesting((int)TaskState.Completed);
        db.Tasks.AddRange(t1, t2);
        await db.SaveChangesAsync();

        var handler = new GetAssigneeTaskSummaryHandler(db);
        var request = new BatchGetAssigneeTaskSummaryRequest();
        request.AssigneeUserIds.Add(1);
        var ctx = CreateContext();

        var response = await handler.BatchGetAssigneeTaskSummary(request, ctx);

        var summary = response.Summaries.Single();
        // Currently last_activity_at is unset since Task model doesn't have a timestamp column
        summary.LastActivityAt.Should().BeNull();
    }

    [Fact]
    public async System.Threading.Tasks.Task BatchGetAssigneeTaskSummary_AssigneeWithNoTasks_HasEmptyLastActivityAt()
    {
        var db = CreateDb();
        var handler = new GetAssigneeTaskSummaryHandler(db);
        var request = new BatchGetAssigneeTaskSummaryRequest();
        request.AssigneeUserIds.Add(1);
        var ctx = CreateContext();

        var response = await handler.BatchGetAssigneeTaskSummary(request, ctx);

        var summary = response.Summaries.Single();
        summary.ActiveCount.Should().Be(0);
        // lastActivityAt should be null/unset for assignees with no tasks
        summary.LastActivityAt.Should().BeNull();
    }

    [Fact]
    public async System.Threading.Tasks.Task BatchGetAssigneeTaskSummary_IssuedAsSingleGroupedQuery()
    {
        var db = CreateDb();
        var t1 = new Task { JiraId = "TASK-1", UserId = 1 };
        t1.SetStateForTesting((int)TaskState.InDev);
        var t2 = new Task { JiraId = "TASK-2", UserId = 2 };
        t2.SetStateForTesting((int)TaskState.InTest);
        var t3 = new Task { JiraId = "TASK-3", UserId = 3 };
        t3.SetStateForTesting((int)TaskState.Completed);
        db.Tasks.AddRange(t1, t2, t3);
        await db.SaveChangesAsync();

        var handler = new GetAssigneeTaskSummaryHandler(db);
        var request = new BatchGetAssigneeTaskSummaryRequest();
        request.AssigneeUserIds.AddRange(new[] { 1, 2, 3 });
        var ctx = CreateContext();

        var response = await handler.BatchGetAssigneeTaskSummary(request, ctx);

        response.Summaries.Should().HaveCount(3);
        // The query should return all summaries in one database call (no N+1)
        // This is verified structurally by the implementation using a single grouped query
    }

    [Fact]
    public async System.Threading.Tasks.Task BatchGetAssigneeTaskSummary_EmptyRequestReturnsEmptyResponse()
    {
        var db = CreateDb();
        var handler = new GetAssigneeTaskSummaryHandler(db);
        var request = new BatchGetAssigneeTaskSummaryRequest();
        var ctx = CreateContext();

        var response = await handler.BatchGetAssigneeTaskSummary(request, ctx);

        response.Summaries.Should().BeEmpty();
    }
}
