using System.Net.Http.Headers;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Api.Tests.Infra;
using Xunit;

namespace OneMoreTaskTracker.Api.Tests.Controllers;

public abstract class TasksControllerTestBase(TasksControllerWebApplicationFactory factory)
    : IClassFixture<TasksControllerWebApplicationFactory>
{
    protected readonly TasksControllerWebApplicationFactory Factory = factory;

    protected string TokenForDeveloper(int userId = 1) =>
        Factory.GenerateToken(userId, "test@example.com", Roles.FrontendDeveloper);

    protected string TokenForManager(int userId = 1) =>
        Factory.GenerateToken(userId, "manager@example.com", Roles.Manager);

    protected HttpClient ClientWithToken(string token)
    {
        var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }
}
