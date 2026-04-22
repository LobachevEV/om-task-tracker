using FluentAssertions;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using NSubstitute;
using OneMoreTaskTracker.Proto.Tasks;
using OneMoreTaskTracker.Proto.Tasks.ListTasksQuery;
using OneMoreTaskTracker.Tasks.Tasks.Data;
using OneMoreTaskTracker.Tasks.Tasks.List;
using OneMoreTaskTracker.Tasks.Tests.TestHelpers;
using Xunit;
using Task = OneMoreTaskTracker.Tasks.Tasks.Data.Task;

namespace OneMoreTaskTracker.Tasks.Tests.Tasks.List;

public sealed class ListTasksHandlerTests
{
    [Fact]
    public async System.Threading.Tasks.Task ListTasks_AsDeveloper_ReturnsOnlyOwnTasks()
    {
        var db = CreateDb();
        db.Tasks.AddRange(
            new Task { JiraId = "TASK-1", UserId = 1 }.WithFeature(1),
            new Task { JiraId = "TASK-2", UserId = 1 }.WithFeature(1),
            new Task { JiraId = "TASK-3", UserId = 2 }.WithFeature(1)
        );
        await db.SaveChangesAsync();

        var handler = new ListTasksHandler(db);
        var request = new ListTasksRequest { UserId = 1, Role = "FrontendDeveloper" };
        var ctx = Substitute.For<ServerCallContext>();
        ctx.CancellationToken.Returns(CancellationToken.None);

        var response = await handler.ListTasks(request, ctx);

        response.Tasks.Should().HaveCount(2);
        response.Tasks.Should().AllSatisfy(t => t.UserId.Should().Be(1));
    }

    [Fact]
    public async System.Threading.Tasks.Task ListTasks_AsManager_ReturnsTeamMemberTasks()
    {
        var db = CreateDb();
        db.Tasks.AddRange(
            new Task { JiraId = "TASK-1", UserId = 1 }.WithFeature(1),
            new Task { JiraId = "TASK-2", UserId = 2 }.WithFeature(1),
            new Task { JiraId = "TASK-3", UserId = 3 }.WithFeature(1),
            new Task { JiraId = "TASK-4", UserId = 4 }.WithFeature(1)
        );
        await db.SaveChangesAsync();

        var handler = new ListTasksHandler(db);
        var request = new ListTasksRequest
        {
            UserId = 99,
            Role = "Manager",
            TeamMemberIds = { 1, 2, 3 }
        };
        var ctx = Substitute.For<ServerCallContext>();
        ctx.CancellationToken.Returns(CancellationToken.None);

        var response = await handler.ListTasks(request, ctx);

        response.Tasks.Should().HaveCount(3);
        response.Tasks.Should().AllSatisfy(t => new[] { 1, 2, 3 }.Should().Contain(t.UserId));
    }

    [Fact]
    public async System.Threading.Tasks.Task ListTasks_WithUnknownRole_ReturnsEmpty()
    {
        var db = CreateDb();
        db.Tasks.AddRange(
            new Task { JiraId = "TASK-1", UserId = 1 }.WithFeature(1),
            new Task { JiraId = "TASK-2", UserId = 2 }.WithFeature(1)
        );
        await db.SaveChangesAsync();

        var handler = new ListTasksHandler(db);
        var request = new ListTasksRequest { UserId = 1, Role = "UnknownRole" };
        var ctx = Substitute.For<ServerCallContext>();
        ctx.CancellationToken.Returns(CancellationToken.None);

        var response = await handler.ListTasks(request, ctx);

        response.Tasks.Should().HaveCount(0);
    }

    [Fact]
    public async System.Threading.Tasks.Task ListTasks_ResultsOrderedByIdDescending()
    {
        var db = CreateDb();
        db.Tasks.AddRange(
            new Task { JiraId = "TASK-1", UserId = 1 }.WithFeature(1),
            new Task { JiraId = "TASK-2", UserId = 1 }.WithFeature(1),
            new Task { JiraId = "TASK-3", UserId = 1 }.WithFeature(1)
        );
        await db.SaveChangesAsync();

        var handler = new ListTasksHandler(db);
        var request = new ListTasksRequest { UserId = 1, Role = "FrontendDeveloper" };
        var ctx = Substitute.For<ServerCallContext>();
        ctx.CancellationToken.Returns(CancellationToken.None);

        var response = await handler.ListTasks(request, ctx);

        var ids = response.Tasks.Select(t => t.Id).ToList();
        ids.Should().BeInDescendingOrder();
    }

    [Fact]
    public async System.Threading.Tasks.Task ListTasks_LimitedTo500Tasks()
    {
        var db = CreateDb();
        var tasks = Enumerable.Range(1, 501)
            .Select(i => new Task { JiraId = $"TASK-{i}", UserId = 1 }.WithFeature(1))
            .ToList();
        db.Tasks.AddRange(tasks);
        await db.SaveChangesAsync();

        var handler = new ListTasksHandler(db);
        var request = new ListTasksRequest { UserId = 1, Role = "FrontendDeveloper" };
        var ctx = Substitute.For<ServerCallContext>();
        ctx.CancellationToken.Returns(CancellationToken.None);

        var response = await handler.ListTasks(request, ctx);

        response.Tasks.Should().HaveCount(500);
    }

    private static TasksDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<TasksDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);
}
