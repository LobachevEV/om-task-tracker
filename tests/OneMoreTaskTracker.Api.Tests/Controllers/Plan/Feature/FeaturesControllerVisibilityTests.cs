using System.Net;
using System.Net.Http.Headers;
using FluentAssertions;
using Grpc.Core;
using NSubstitute;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Api.Tests.Infra;
using OneMoreTaskTracker.Proto.Features;
using OneMoreTaskTracker.Proto.Features.GetFeatureQuery;
using OneMoreTaskTracker.Proto.Features.ListFeaturesQuery;
using OneMoreTaskTracker.Proto.Users;
using Xunit;

namespace OneMoreTaskTracker.Api.Tests.Controllers.Plan.Feature;

public sealed class FeaturesControllerVisibilityTests(TasksControllerWebApplicationFactory factory)
    : IClassFixture<TasksControllerWebApplicationFactory>
{
    private const int ManagerUserId = 10;
    private const int LeadUserId = 20;
    private const int SubStageOwnerUserId = 30;
    private const int OutsiderUserId = 99;
    private const int FeatureId = 42;

    private HttpClient ClientFor(int userId, string role) =>
        ClientWithToken(factory.GenerateToken(userId, $"user{userId}@example.com", role));

    private HttpClient ClientWithToken(string token)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private void StubListReturning(params Proto.Features.ListFeaturesQuery.FeatureDto[] features)
    {
        var response = new ListFeaturesResponse();
        response.Features.AddRange(features);
        factory.MockFeaturesLister
            .ListAsync(
                Arg.Any<ListFeaturesRequest>(),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(response));
    }

    private static Proto.Features.ListFeaturesQuery.FeatureDto MakeListDto(int id, int leadUserId = 0) =>
        new() { Id = id, Title = $"Feature {id}", LeadUserId = leadUserId };

    private void StubGetReturning(Proto.Features.GetFeatureQuery.FeatureDto dto)
    {
        factory.MockFeatureGetter
            .GetAsync(
                Arg.Is<GetFeatureRequest>(r => r.Id == dto.Id),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(dto));
    }

    private void StubEmptyRoster()
    {
        factory.MockUserService
            .GetTeamRosterAsync(
                Arg.Any<GetTeamRosterRequest>(),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new GetTeamRosterResponse()));
    }

    [Fact]
    public async Task ListFeatures_FrontendDeveloperLead_ReceivesNonEmptyList()
    {
        ListFeaturesRequest? captured = null;
        factory.MockFeaturesLister
            .ListAsync(
                Arg.Do<ListFeaturesRequest>(r => captured = r),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new ListFeaturesResponse
            {
                Features = { MakeListDto(FeatureId, leadUserId: LeadUserId) }
            }));

        var client = ClientFor(LeadUserId, Roles.FrontendDeveloper);
        var response = await client.GetAsync("/api/plan/features");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured.Should().NotBeNull();
        captured!.CallerUserId.Should().Be(LeadUserId);
        captured.ManagerUserId.Should().Be(0);
    }

    [Fact]
    public async Task ListFeatures_NonManager_DoesNotSetManagerUserIdOnUpstreamRequest()
    {
        ListFeaturesRequest? captured = null;
        factory.MockFeaturesLister
            .ListAsync(
                Arg.Do<ListFeaturesRequest>(r => captured = r),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new ListFeaturesResponse()));

        var client = ClientFor(SubStageOwnerUserId, Roles.BackendDeveloper);
        var response = await client.GetAsync("/api/plan/features");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured.Should().NotBeNull();
        captured!.ManagerUserId.Should().Be(0);
        captured.CallerUserId.Should().Be(SubStageOwnerUserId);
    }

    [Fact]
    public async Task ListFeatures_NonParticipantNonManager_ReceivesEmptyList()
    {
        StubListReturning();

        var client = ClientFor(OutsiderUserId, Roles.BackendDeveloper);
        var response = await client.GetAsync("/api/plan/features");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Be("[]");
    }

    [Fact]
    public async Task GetFeature_NonParticipantNonManager_Returns403()
    {
        var dto = new Proto.Features.GetFeatureQuery.FeatureDto
        {
            Id = FeatureId,
            Title = "Test Feature",
            ManagerUserId = ManagerUserId,
            LeadUserId = LeadUserId,
        };
        StubGetReturning(dto);

        var client = ClientFor(OutsiderUserId, Roles.BackendDeveloper);
        var response = await client.GetAsync($"/api/plan/features/{FeatureId}");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetFeature_ParticipantViaSubStageOwner_Returns200()
    {
        var dto = new Proto.Features.GetFeatureQuery.FeatureDto
        {
            Id = FeatureId,
            Title = "Test Feature",
            ManagerUserId = ManagerUserId,
            Taxonomy = new FeatureTaxonomyDto
            {
                SubStages =
                {
                    new FeatureSubStageDto { Id = 1, OwnerUserId = SubStageOwnerUserId }
                }
            }
        };
        StubGetReturning(dto);
        StubEmptyRoster();

        var client = ClientFor(SubStageOwnerUserId, Roles.BackendDeveloper);
        var response = await client.GetAsync($"/api/plan/features/{FeatureId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task HealthEndpoint_ReturnsOkAnonymously()
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync("/health");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("ok");
    }
}
