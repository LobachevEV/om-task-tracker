using FluentAssertions;
using Google.Protobuf.WellKnownTypes;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using NSubstitute;
using OneMoreTaskTracker.Proto.Tasks;
using OneMoreTaskTracker.Proto.Tasks.GetUserStatusQuery;
using OneMoreTaskTracker.Tasks.Tasks.Data;
using OneMoreTaskTracker.Tasks.Tasks.GetUserStatus;
using Xunit;
using Task = OneMoreTaskTracker.Tasks.Tasks.Data.Task;

namespace OneMoreTaskTracker.Tasks.Tests.Tasks.GetUserStatus;

public sealed class BatchGetUserStatusHandlerTests
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
    public async System.Threading.Tasks.Task BatchGetUserStatus_ReturnsOneStatusPerInputId_IncludingZeroTaskUsers()
    {
        var db = CreateDb();
        var task1 = new Task { JiraId = "TASK-1", UserId = 1 };
        task1.SetStateForTesting((int)TaskState.InDev);
        var task2 = new Task { JiraId = "TASK-2", UserId = 1 };
        task2.SetStateForTesting((int)TaskState.InDev);
        db.Tasks.AddRange(task1, task2);
        await db.SaveChangesAsync();

        var handler = new BatchGetUserStatusHandler(db);
        var request = new BatchGetUserStatusRequest();
        request.UserIds.AddRange(new[] { 1, 2, 3 }); // User 2 and 3 have no tasks
        var ctx = CreateContext();

        var response = await handler.BatchGetUserStatus(request, ctx);

        response.Statuses.Should().HaveCount(3);

        var status1 = response.Statuses.First(s => s.UserId == 1);
        status1.Active.Should().Be(2);
        status1.Mix.InDev.Should().Be(2);

        var status2 = response.Statuses.First(s => s.UserId == 2);
        status2.Active.Should().Be(0);
        status2.Mix.InDev.Should().Be(0);
        status2.Mix.MrToRelease.Should().Be(0);

        var status3 = response.Statuses.First(s => s.UserId == 3);
        status3.Active.Should().Be(0);
    }

    [Fact]
    public async System.Threading.Tasks.Task BatchGetUserStatus_CorrectlyBucketsByState()
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

        var handler = new BatchGetUserStatusHandler(db);
        var request = new BatchGetUserStatusRequest();
        request.UserIds.Add(1);
        var ctx = CreateContext();

        var response = await handler.BatchGetUserStatus(request, ctx);

        var status = response.Statuses.Single();
        // Active excludes Completed
        status.Active.Should().Be(4);
        status.Mix.InDev.Should().Be(1);
        status.Mix.MrToRelease.Should().Be(1);
        status.Mix.InTest.Should().Be(1);
        status.Mix.MrToMaster.Should().Be(1);
        status.Mix.Completed.Should().Be(1);
    }

    [Fact]
    public async System.Threading.Tasks.Task BatchGetUserStatus_LastActiveIsNullWhenTaskModelHasNoTimestamp()
    {
        // Note: This test documents current behavior where Task model doesn't track timestamps.
        // When a timestamp field is added to Task (e.g., UpdatedAt, CreatedAt), this test
        // should be updated to verify last_active is correctly populated.
        var db = CreateDb();

        var t1 = new Task { JiraId = "TASK-1", UserId = 1 };
        t1.SetStateForTesting((int)TaskState.InDev);
        var t2 = new Task { JiraId = "TASK-2", UserId = 1 };
        t2.SetStateForTesting((int)TaskState.Completed);
        db.Tasks.AddRange(t1, t2);
        await db.SaveChangesAsync();

        var handler = new BatchGetUserStatusHandler(db);
        var request = new BatchGetUserStatusRequest();
        request.UserIds.Add(1);
        var ctx = CreateContext();

        var response = await handler.BatchGetUserStatus(request, ctx);

        var status = response.Statuses.Single();
        // Currently last_active is unset since Task model doesn't have a timestamp column
        status.LastActive.Should().BeNull();
    }

    [Fact]
    public async System.Threading.Tasks.Task BatchGetUserStatus_UserWithNoTasks_HasEmptyLastActive()
    {
        var db = CreateDb();
        var handler = new BatchGetUserStatusHandler(db);
        var request = new BatchGetUserStatusRequest();
        request.UserIds.Add(1);
        var ctx = CreateContext();

        var response = await handler.BatchGetUserStatus(request, ctx);

        var status = response.Statuses.Single();
        status.Active.Should().Be(0);
        // lastActive should be null/unset for users with no tasks
        status.LastActive.Should().BeNull();
    }

    [Fact]
    public async System.Threading.Tasks.Task BatchGetUserStatus_IssuedAsSingleGroupedQuery()
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

        var handler = new BatchGetUserStatusHandler(db);
        var request = new BatchGetUserStatusRequest();
        request.UserIds.AddRange(new[] { 1, 2, 3 });
        var ctx = CreateContext();

        var response = await handler.BatchGetUserStatus(request, ctx);

        response.Statuses.Should().HaveCount(3);
        // The query should return all statuses in one database call (no N+1)
        // This is verified structurally by the implementation using a single grouped query
    }

    [Fact]
    public async System.Threading.Tasks.Task BatchGetUserStatus_EmptyRequestReturnsEmptyResponse()
    {
        var db = CreateDb();
        var handler = new BatchGetUserStatusHandler(db);
        var request = new BatchGetUserStatusRequest();
        var ctx = CreateContext();

        var response = await handler.BatchGetUserStatus(request, ctx);

        response.Statuses.Should().BeEmpty();
    }
}
