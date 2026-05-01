using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Grpc.Core;
using NSubstitute;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Api.Tests.Infra;
using OneMoreTaskTracker.Proto.Features.AppendFeatureSubStageCommand;
using OneMoreTaskTracker.Proto.Features.PatchFeatureSubStageCommand;
using OneMoreTaskTracker.Proto.Users;
using Xunit;

namespace OneMoreTaskTracker.Api.Tests.Controllers;

public sealed class SubStageControllersOwnerRosterTests(TasksControllerWebApplicationFactory factory)
    : IClassFixture<TasksControllerWebApplicationFactory>
{
    private const int ManagerUserId = 7;
    private const int RosterMemberId = 11;
    private const int OutsiderUserId = 99;
    private const int FeatureId = 42;
    private const int SubStageId = 5;

    private HttpClient ManagerClient()
    {
        var token = factory.GenerateToken(ManagerUserId, "manager@example.com", Roles.Manager);
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private void StubRosterContaining(params int[] memberIds)
    {
        var response = new GetTeamRosterResponse();
        foreach (var id in memberIds)
        {
            response.Members.Add(new TeamRosterMember
            {
                UserId = id,
                Email = $"user{id}@example.com",
                Role = Roles.FrontendDeveloper,
                ManagerId = ManagerUserId,
            });
        }

        factory.MockUserService
            .GetTeamRosterAsync(
                Arg.Is<GetTeamRosterRequest>(req => req.ManagerId == ManagerUserId),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(response));
    }

    private static StringContent JsonBody(object payload) =>
        new(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

    private static async Task<JsonElement> ReadJsonAsync(HttpResponseMessage response)
    {
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        return doc.RootElement.Clone();
    }

    [Fact]
    public async Task PatchSubStage_OwnerNotInRoster_Returns400_WithV1Envelope()
    {
        StubRosterContaining(RosterMemberId);
        factory.MockFeatureSubStagePatcher.ClearReceivedCalls();

        var client = ManagerClient();
        var response = await client.PatchAsync(
            $"/api/plan/features/{FeatureId}/sub-stages/{SubStageId}",
            JsonBody(new { ownerUserId = OutsiderUserId }));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var json = await ReadJsonAsync(response);
        json.GetProperty("error").GetString().Should().Be("Pick a teammate from the list");

        factory.MockFeatureSubStagePatcher
            .DidNotReceive()
            .PatchAsync(
                Arg.Any<PatchFeatureSubStageRequest>(),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task PatchSubStage_OwnerInRoster_Returns200_AndCallsHandler()
    {
        StubRosterContaining(RosterMemberId);
        factory.MockFeatureSubStagePatcher.ClearReceivedCalls();
        factory.MockFeatureSubStagePatcher
            .PatchAsync(
                Arg.Any<PatchFeatureSubStageRequest>(),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new FeatureTaxonomyResponse
            {
                FeatureId = FeatureId,
                FeatureVersion = 3,
                Taxonomy = new OneMoreTaskTracker.Proto.Features.FeatureTaxonomyDto(),
            }));

        var client = ManagerClient();
        var response = await client.PatchAsync(
            $"/api/plan/features/{FeatureId}/sub-stages/{SubStageId}",
            JsonBody(new { ownerUserId = RosterMemberId }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        factory.MockFeatureSubStagePatcher
            .Received(1)
            .PatchAsync(
                Arg.Is<PatchFeatureSubStageRequest>(r =>
                    r.FeatureId == FeatureId &&
                    r.SubStageId == SubStageId &&
                    r.OwnerUserId == RosterMemberId),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task PatchSubStage_OwnerLessThanOne_Returns400_InvalidRequest()
    {
        StubRosterContaining(RosterMemberId);
        factory.MockFeatureSubStagePatcher.ClearReceivedCalls();

        var client = ManagerClient();
        var response = await client.PatchAsync(
            $"/api/plan/features/{FeatureId}/sub-stages/{SubStageId}",
            JsonBody(new { ownerUserId = 0 }));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var json = await ReadJsonAsync(response);
        json.GetProperty("error").GetString().Should().Be("Invalid request data");

        factory.MockFeatureSubStagePatcher
            .DidNotReceive()
            .PatchAsync(
                Arg.Any<PatchFeatureSubStageRequest>(),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task AppendSubStage_OwnerNotInRoster_Returns400_WithV1Envelope()
    {
        StubRosterContaining(RosterMemberId);
        factory.MockFeatureSubStageAppender.ClearReceivedCalls();

        var client = ManagerClient();
        var response = await client.PostAsync(
            $"/api/plan/features/{FeatureId}/phases/backend/development/sub-stages",
            JsonBody(new { ownerUserId = OutsiderUserId }));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var json = await ReadJsonAsync(response);
        json.GetProperty("error").GetString().Should().Be("Pick a teammate from the list");

        factory.MockFeatureSubStageAppender
            .DidNotReceive()
            .AppendAsync(
                Arg.Any<AppendFeatureSubStageRequest>(),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task AppendSubStage_OwnerInRoster_Returns200_AndCallsHandler()
    {
        StubRosterContaining(RosterMemberId);
        factory.MockFeatureSubStageAppender.ClearReceivedCalls();
        factory.MockFeatureSubStageAppender
            .AppendAsync(
                Arg.Any<AppendFeatureSubStageRequest>(),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new AppendFeatureSubStageResponse
            {
                FeatureId = FeatureId,
                FeatureVersion = 4,
                CreatedSubStageId = 99,
                Taxonomy = new OneMoreTaskTracker.Proto.Features.FeatureTaxonomyDto(),
            }));

        var client = ManagerClient();
        var response = await client.PostAsync(
            $"/api/plan/features/{FeatureId}/phases/backend/development/sub-stages",
            JsonBody(new { ownerUserId = RosterMemberId }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        factory.MockFeatureSubStageAppender
            .Received(1)
            .AppendAsync(
                Arg.Is<AppendFeatureSubStageRequest>(r =>
                    r.FeatureId == FeatureId &&
                    r.OwnerUserId == RosterMemberId &&
                    r.Track == "backend" &&
                    r.Phase == "development"),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task AppendSubStage_OwnerLessThanOne_Returns400_InvalidRequest()
    {
        StubRosterContaining(RosterMemberId);
        factory.MockFeatureSubStageAppender.ClearReceivedCalls();

        var client = ManagerClient();
        var response = await client.PostAsync(
            $"/api/plan/features/{FeatureId}/phases/backend/development/sub-stages",
            JsonBody(new { ownerUserId = -1 }));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var json = await ReadJsonAsync(response);
        json.GetProperty("error").GetString().Should().Be("Invalid request data");

        factory.MockFeatureSubStageAppender
            .DidNotReceive()
            .AppendAsync(
                Arg.Any<AppendFeatureSubStageRequest>(),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>());
    }
}
