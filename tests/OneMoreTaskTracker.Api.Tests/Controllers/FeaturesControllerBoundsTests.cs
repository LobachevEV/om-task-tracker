using System.Net;
using System.Net.Http.Headers;
using FluentAssertions;
using Grpc.Core;
using NSubstitute;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Api.Tests.Infra;
using OneMoreTaskTracker.Proto.Features.GetFeatureBoundsQuery;
using Xunit;

namespace OneMoreTaskTracker.Api.Tests.Controllers;

public sealed class FeaturesControllerBoundsTests(TasksControllerWebApplicationFactory factory)
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

    [Fact]
    public async Task GetBounds_WithoutAuthentication_Returns401()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/plan/features/bounds");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetBounds_PopulatesPayloadAndCacheControlHeader()
    {
        const int callerId = 42;
        var client = ClientWithToken(ManagerToken(callerId));

        GetFeatureBoundsRequest? captured = null;
        _factory.MockBoundsGetter
            .GetAsync(Arg.Do<GetFeatureBoundsRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new GetFeatureBoundsResponse
            {
                EarliestPlannedStart = "2026-01-15",
                LatestPlannedEnd     = "2026-09-30",
            }));

        var response = await client.GetAsync("/api/plan/features/bounds");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured.Should().NotBeNull();
        captured!.ManagerUserId.Should().Be(callerId);

        response.Headers.CacheControl.Should().NotBeNull();
        response.Headers.CacheControl!.Private.Should().BeTrue();
        response.Headers.CacheControl.MaxAge.Should().Be(TimeSpan.FromSeconds(10));

        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("\"earliestPlannedStart\":\"2026-01-15\"");
        body.Should().Contain("\"latestPlannedEnd\":\"2026-09-30\"");
    }

    [Fact]
    public async Task GetBounds_EmptyDataset_ReturnsNullsNot404()
    {
        var client = ClientWithToken(ManagerToken());

        _factory.MockBoundsGetter
            .GetAsync(Arg.Any<GetFeatureBoundsRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new GetFeatureBoundsResponse
            {
                EarliestPlannedStart = string.Empty,
                LatestPlannedEnd     = string.Empty,
            }));

        var response = await client.GetAsync("/api/plan/features/bounds");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("\"earliestPlannedStart\":null");
        body.Should().Contain("\"latestPlannedEnd\":null");
    }

    [Fact]
    public async Task GetBounds_AcceptsScopeAndStateQueryParams()
    {
        var client = ClientWithToken(ManagerToken());

        _factory.MockBoundsGetter
            .GetAsync(Arg.Any<GetFeatureBoundsRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new GetFeatureBoundsResponse
            {
                EarliestPlannedStart = "2026-02-01",
                LatestPlannedEnd     = "2026-02-28",
            }));

        var response = await client.GetAsync("/api/plan/features/bounds?scope=mine&state=Development");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
