using FluentAssertions;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using NSubstitute;
using OneMoreTaskTracker.Proto.Tasks.AttachTaskCommand;
using OneMoreTaskTracker.Tasks.Tasks.Attach;
using OneMoreTaskTracker.Tasks.Tasks.Data;
using OneMoreTaskTracker.Tasks.Tests.TestHelpers;
using Xunit;
using TaskEntity = OneMoreTaskTracker.Tasks.Tasks.Data.Task;

namespace OneMoreTaskTracker.Tasks.Tests;

public sealed class AttachTaskToFeatureHandlerTests
{
    [Fact]
    public async System.Threading.Tasks.Task Attach_UnknownJiraTaskId_ThrowsNotFound()
    {
        var db = CreateDb();
        var handler = new AttachTaskToFeatureHandler(db);

        var request = new AttachTaskToFeatureRequest { JiraTaskId = "MISSING-1", FeatureId = 42 };
        var ex = await Assert.ThrowsAsync<RpcException>(() => handler.Attach(request, CreateContext()));

        ex.StatusCode.Should().Be(StatusCode.NotFound);
    }

    [Fact]
    public async System.Threading.Tasks.Task Attach_FeatureIdZero_ThrowsInvalidArgument()
    {
        var validator = new AttachTaskToFeatureRequestValidator();
        var request = new AttachTaskToFeatureRequest { JiraTaskId = "TASK-1", FeatureId = 0 };

        var ex = await Assert.ThrowsAsync<RpcException>(() =>
            ValidationPipeline.ValidateAsync(validator, request));

        ex.StatusCode.Should().Be(StatusCode.InvalidArgument);
        ex.Status.Detail.Should().Contain("feature_id");
    }

    [Fact]
    public async System.Threading.Tasks.Task Attach_AlreadyAttachedToTarget_IsIdempotent_NoChanges()
    {
        var db = CreateDb();
        var task = new TaskEntity { JiraId = "TASK-7", UserId = 1 }.WithFeature(5);
        db.Tasks.Add(task);
        await db.SaveChangesAsync();

        var handler = new AttachTaskToFeatureHandler(db);
        var request = new AttachTaskToFeatureRequest { JiraTaskId = "TASK-7", FeatureId = 5 };

        var response = await handler.Attach(request, CreateContext());

        response.FeatureId.Should().Be(5);
        db.ChangeTracker.HasChanges().Should().BeFalse();
        var reloaded = await db.Tasks.AsNoTracking().SingleAsync(t => t.JiraId == "TASK-7");
        reloaded.FeatureId.Should().Be(5);
    }

    [Fact]
    public async System.Threading.Tasks.Task Attach_HappyPath_ChangesFeatureIdAndReturnsNewId()
    {
        var db = CreateDb();
        var task = new TaskEntity { JiraId = "TASK-42", UserId = 1 }.WithFeature(5);
        db.Tasks.Add(task);
        await db.SaveChangesAsync();

        var handler = new AttachTaskToFeatureHandler(db);
        var request = new AttachTaskToFeatureRequest { JiraTaskId = "TASK-42", FeatureId = 9 };

        var response = await handler.Attach(request, CreateContext());

        response.FeatureId.Should().Be(9);
        response.JiraTaskId.Should().Be("TASK-42");
        response.TaskId.Should().Be(task.Id);

        var reloaded = await db.Tasks.AsNoTracking().SingleAsync(t => t.JiraId == "TASK-42");
        reloaded.FeatureId.Should().Be(9);
    }

    [Fact]
    public async System.Threading.Tasks.Task Detach_WithoutReassign_ThrowsFailedPrecondition()
    {
        var validator = new DetachTaskFromFeatureRequestValidator();
        var request = new DetachTaskFromFeatureRequest { JiraTaskId = "TASK-1" };

        var ex = await Assert.ThrowsAsync<RpcException>(() =>
            ValidationPipeline.ValidateAsync(validator, request));

        ex.StatusCode.Should().Be(StatusCode.FailedPrecondition);
    }

    [Fact]
    public async System.Threading.Tasks.Task Detach_WithValidReassign_MovesTaskToTargetFeature()
    {
        var db = CreateDb();
        var task = new TaskEntity { JiraId = "TASK-77", UserId = 1 }.WithFeature(3);
        db.Tasks.Add(task);
        await db.SaveChangesAsync();

        var handler = new AttachTaskToFeatureHandler(db);
        var request = new DetachTaskFromFeatureRequest
        {
            JiraTaskId = "TASK-77",
            ReassignToFeatureId = 11,
        };

        var response = await handler.Detach(request, CreateContext());

        response.FeatureId.Should().Be(11);
        var reloaded = await db.Tasks.AsNoTracking().SingleAsync(t => t.JiraId == "TASK-77");
        reloaded.FeatureId.Should().Be(11);
    }

    private static TasksDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<TasksDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static ServerCallContext CreateContext()
    {
        var ctx = Substitute.For<ServerCallContext>();
        ctx.CancellationToken.Returns(CancellationToken.None);
        return ctx;
    }
}
