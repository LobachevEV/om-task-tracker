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

public sealed class FeaturesControllerWindowTests(TasksControllerWebApplicationFactory factory)
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
    public async Task ListFeatures_WithBadWindowStart_Returns400AndDoesNotCallUpstream()
    {
        var client = ClientWithToken(ManagerToken());

        var response = await client.GetAsync("/api/plan/features?windowStart=not-a-date");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Invalid request data");

        _ = _factory.MockFeaturesLister.DidNotReceive()
            .ListAsync(Arg.Is<ListFeaturesRequest>(r => r.WindowStart == "not-a-date"),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ListFeatures_WithBadWindowEnd_Returns400AndDoesNotCallUpstream()
    {
        var client = ClientWithToken(ManagerToken());

        var response = await client.GetAsync("/api/plan/features?windowEnd=2026-13-99");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        _ = _factory.MockFeaturesLister.DidNotReceive()
            .ListAsync(Arg.Is<ListFeaturesRequest>(r => r.WindowEnd == "2026-13-99"),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ListFeatures_WithInvertedWindow_Returns400AndDoesNotCallUpstream()
    {
        var client = ClientWithToken(ManagerToken());

        var response = await client.GetAsync("/api/plan/features?windowStart=2026-06-01&windowEnd=2026-05-01");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Invalid request data");

        _ = _factory.MockFeaturesLister.DidNotReceive()
            .ListAsync(Arg.Is<ListFeaturesRequest>(r => r.WindowStart == "2026-06-01" && r.WindowEnd == "2026-05-01"),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ListFeatures_WithValidWindow_PropagatesToUpstreamRequest()
    {
        var client = ClientWithToken(ManagerToken(userId: 7));

        ListFeaturesRequest? captured = null;
        _factory.MockFeaturesLister
            .ListAsync(Arg.Do<ListFeaturesRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new ListFeaturesResponse()));

        var response = await client.GetAsync("/api/plan/features?windowStart=2026-05-01&windowEnd=2026-05-31");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured.Should().NotBeNull();
        captured!.ManagerUserId.Should().Be(7);
        captured.WindowStart.Should().Be("2026-05-01");
        captured.WindowEnd.Should().Be("2026-05-31");
    }

    [Fact]
    public async Task ListFeatures_WithoutWindowParams_PassesEmptyStringsUpstream()
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
        captured!.WindowStart.Should().BeEmpty();
        captured.WindowEnd.Should().BeEmpty();
    }

    [Fact]
    public async Task ListFeatures_WithOnlyWindowStart_AcceptsOpenEndedWindow()
    {
        var client = ClientWithToken(ManagerToken());

        ListFeaturesRequest? captured = null;
        _factory.MockFeaturesLister
            .ListAsync(Arg.Do<ListFeaturesRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new ListFeaturesResponse()));

        var response = await client.GetAsync("/api/plan/features?windowStart=2026-05-01");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured!.WindowStart.Should().Be("2026-05-01");
        captured.WindowEnd.Should().BeEmpty();
    }
}
