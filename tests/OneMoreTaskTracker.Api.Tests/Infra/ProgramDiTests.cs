using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using OneMoreTaskTracker.Proto.Tasks;
using OneMoreTaskTracker.Proto.Tasks.CreateTaskCommand;
using OneMoreTaskTracker.Proto.Tasks.GetTaskQuery;
using OneMoreTaskTracker.Proto.Tasks.ListTasksQuery;
using OneMoreTaskTracker.Proto.Tasks.TaskAggregateQuery;
using OneMoreTaskTracker.Proto.Users;
using Xunit;

namespace OneMoreTaskTracker.Api.Tests.Infra;

/// <summary>
/// Regression test for controller DI wiring. Verifies that every gRPC client type
/// actually used by controllers is registered in Program.cs via AddGrpcClient<T>.
///
/// This test intentionally does NOT mock clients; it drives the real production
/// container to catch missing registrations that would otherwise be invisible
/// when all other tests mock the clients via ConfigureTestServices.
/// </summary>
public sealed class ProgramDiTests : IClassFixture<ProductionWiringWebApplicationFactory>
{
    private readonly ProductionWiringWebApplicationFactory _factory;

    public ProgramDiTests(ProductionWiringWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public void Program_ConfiguresAllGrpcClients_SuccessfullyResolvable()
    {
        using var scope = _factory.Services.CreateScope();
        var provider = scope.ServiceProvider;

        // Verify each gRPC client type is registered and can be resolved.
        // If any AddGrpcClient<T> line is missing from Program.cs, GetRequiredService
        // will throw InvalidOperationException, catching the registration gap immediately.

        var _ = new object?[]
        {
            provider.GetRequiredService<TaskCreator.TaskCreatorClient>(),
            provider.GetRequiredService<TaskLister.TaskListerClient>(),
            provider.GetRequiredService<TaskGetter.TaskGetterClient>(),
            provider.GetRequiredService<TaskMover.TaskMoverClient>(),
            provider.GetRequiredService<TaskAggregateQuery.TaskAggregateQueryClient>(),
            provider.GetRequiredService<UserService.UserServiceClient>()
        };

        // If we reach here without exception, all clients are registered.
        // The array itself is not asserted; success is the absence of InvalidOperationException.
        _.Should().AllSatisfy(x => x.Should().NotBeNull());
    }
}
