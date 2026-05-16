using System.Net;
using System.Net.Http.Headers;
using FluentAssertions;
using Grpc.Core;
using NSubstitute;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Api.Tests.Infra;
using OneMoreTaskTracker.Proto.Features;
using OneMoreTaskTracker.Proto.Features.ListFeaturesQuery;
using Xunit;

namespace OneMoreTaskTracker.Api.Tests.Controllers;

public sealed class FeaturesControllerScopeTests(TasksControllerWebApplicationFactory factory)
    : IClassFixture<TasksControllerWebApplicationFactory>
{
    private readonly TasksControllerWebApplicationFactory _factory = factory;

    private HttpClient ClientWithToken(string token)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private string ManagerToken(int userId = 1) =>
        _factory.GenerateToken(userId, "manager@example.com", Roles.Manager);

    private string DeveloperToken(int userId) =>
        _factory.GenerateToken(userId, "dev@example.com", Roles.FrontendDeveloper);

    private static ListFeaturesResponse FiveFeatures(int callerId) =>
        new()
        {
            Features =
            {
                new FeatureDto { Id = 1, LeadUserId = callerId, ManagerUserId = callerId },
                new FeatureDto { Id = 2, LeadUserId = callerId, ManagerUserId = callerId },
                new FeatureDto { Id = 3, LeadUserId = callerId, ManagerUserId = callerId },
                new FeatureDto { Id = 4, LeadUserId = 99, ManagerUserId = callerId },
                new FeatureDto { Id = 5, LeadUserId = 99, ManagerUserId = callerId },
            }
        };

    [Fact]
    public async Task ListFeatures_WithScopeAll_PassesEmptyScopeAndZeroCallerIdUpstream()
    {
        var client = ClientWithToken(ManagerToken(userId: 7));

        ListFeaturesRequest? captured = null;
        _factory.MockFeaturesLister
            .ListAsync(Arg.Do<ListFeaturesRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new ListFeaturesResponse()));

        var response = await client.GetAsync("/api/plan/features?scope=all");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured.Should().NotBeNull();
        captured!.Scope.Should().BeEmpty();
        captured.CallerUserId.Should().Be(0);
    }

    [Fact]
    public async Task ListFeatures_WithoutScope_TreatedAsAll()
    {
        var client = ClientWithToken(ManagerToken(userId: 7));

        ListFeaturesRequest? captured = null;
        _factory.MockFeaturesLister
            .ListAsync(Arg.Do<ListFeaturesRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new ListFeaturesResponse()));

        var response = await client.GetAsync("/api/plan/features");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured.Should().NotBeNull();
        captured!.Scope.Should().BeEmpty();
        captured.CallerUserId.Should().Be(0);
    }

    [Fact]
    public async Task ListFeatures_WithScopeMine_FiltersDownstreamByLeadUserId()
    {
        const int callerId = 1;
        var client = ClientWithToken(ManagerToken(userId: callerId));

        _factory.MockFeaturesLister
            .ListAsync(Arg.Any<ListFeaturesRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(FiveFeatures(callerId)));

        var response = await client.GetAsync("/api/plan/features?scope=mine");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var summaries = await GrpcTestHelpers.ReadAsAsync<List<dynamic>>(response.Content);
        summaries.Should().HaveCount(3);
    }

    [Fact]
    public async Task ListFeatures_WithScopeMine_EmptyResultWhenCallerLeadsNothing()
    {
        const int callerId = 42;
        var client = ClientWithToken(ManagerToken(userId: callerId));

        _factory.MockFeaturesLister
            .ListAsync(Arg.Any<ListFeaturesRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new ListFeaturesResponse
            {
                Features =
                {
                    new FeatureDto { Id = 10, LeadUserId = 99, ManagerUserId = callerId },
                    new FeatureDto { Id = 11, LeadUserId = 99, ManagerUserId = callerId },
                }
            }));

        var response = await client.GetAsync("/api/plan/features?scope=mine");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var summaries = await GrpcTestHelpers.ReadAsAsync<List<dynamic>>(response.Content);
        summaries.Should().BeEmpty();
    }

    [Fact]
    public async Task ListFeatures_WithInvalidScope_Returns400AndDoesNotCallUpstream()
    {
        var client = ClientWithToken(ManagerToken());

        var response = await client.GetAsync("/api/plan/features?scope=totally-invalid-value");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Invalid");

        _ = _factory.MockFeaturesLister.DidNotReceive()
            .ListAsync(Arg.Any<ListFeaturesRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ListFeatures_NonManagerCaller_ScopeMine_FiltersBySelfLead()
    {
        const int devId = 55;
        var client = ClientWithToken(DeveloperToken(userId: devId));

        _factory.MockFeaturesLister
            .ListAsync(Arg.Any<ListFeaturesRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new ListFeaturesResponse
            {
                Features =
                {
                    new FeatureDto { Id = 20, LeadUserId = devId, ManagerUserId = 1 },
                    new FeatureDto { Id = 21, LeadUserId = 99, ManagerUserId = 1 },
                }
            }));

        var response = await client.GetAsync("/api/plan/features?scope=mine");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var summaries = await GrpcTestHelpers.ReadAsAsync<List<dynamic>>(response.Content);
        summaries.Should().HaveCount(1);
    }
}
