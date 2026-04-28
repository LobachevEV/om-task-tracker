using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Grpc.Core;
using NSubstitute;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Api.Tests.Infra;
using OneMoreTaskTracker.Proto.Features;
using OneMoreTaskTracker.Proto.Features.PatchFeatureCommand;
using OneMoreTaskTracker.Proto.Users;
using Xunit;
using PatchFeatureDto = OneMoreTaskTracker.Proto.Features.PatchFeatureCommand.FeatureDto;

namespace OneMoreTaskTracker.Api.Tests.Controllers;

public sealed class PatchFeatureSparseEndpointTests(TasksControllerWebApplicationFactory factory)
    : IClassFixture<TasksControllerWebApplicationFactory>
{
    private readonly TasksControllerWebApplicationFactory _factory = factory;

    private static StringContent JsonBody(object payload) =>
        new(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

    private HttpClient ClientWithToken(string token)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private string ManagerToken(int userId = 1) =>
        _factory.GenerateToken(userId, "manager@example.com", Roles.Manager);

    private string DevToken(int userId = 2) =>
        _factory.GenerateToken(userId, "dev@example.com", Roles.FrontendDeveloper);

    private void StubRoster(int managerUserId, params int[] teammateUserIds)
    {
        var response = new GetTeamRosterResponse
        {
            Members =
            {
                new TeamRosterMember
                {
                    UserId = managerUserId,
                    Email = "manager@example.com",
                    Role = Roles.Manager,
                }
            }
        };
        foreach (var userId in teammateUserIds)
        {
            response.Members.Add(new TeamRosterMember
            {
                UserId = userId,
                Email = $"user{userId}@example.com",
                Role = Roles.FrontendDeveloper,
                ManagerId = managerUserId,
            });
        }

        _factory.MockUserService
            .GetTeamRosterAsync(Arg.Any<GetTeamRosterRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(response));
    }

    private static FeatureStagePlan ProtoPlan(FeatureState stage) =>
        new()
        {
            Stage = stage,
            PlannedStart = string.Empty,
            PlannedEnd = string.Empty,
            PerformerUserId = 0,
        };

    private static PatchFeatureDto FiveRowDto(int id = 1, int managerUserId = 1, int leadUserId = 1) =>
        new()
        {
            Id = id,
            Title = "F",
            Description = string.Empty,
            State = FeatureState.Development,
            PlannedStart = string.Empty,
            PlannedEnd = string.Empty,
            LeadUserId = leadUserId,
            ManagerUserId = managerUserId,
            CreatedAt = DateTime.UtcNow.ToString("O"),
            UpdatedAt = DateTime.UtcNow.ToString("O"),
            Version = 4,
            StagePlans =
            {
                ProtoPlan(FeatureState.CsApproving),
                ProtoPlan(FeatureState.Development),
                ProtoPlan(FeatureState.Testing),
                ProtoPlan(FeatureState.EthalonTesting),
                ProtoPlan(FeatureState.LiveRelease),
            }
        };

    [Fact]
    public async Task Patch_TitleOnly_ForwardsHasTitleAndOmitsOthers()
    {
        var client = ClientWithToken(ManagerToken(userId: 42));
        PatchFeatureRequest? captured = null;
        _factory.MockFeaturePatcher
            .PatchAsync(Arg.Do<PatchFeatureRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(FiveRowDto(managerUserId: 42)));

        var response = await client.PatchAsync("/api/plan/features/1",
            JsonBody(new { title = "Renamed" }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured.Should().NotBeNull();
        captured!.Id.Should().Be(1);
        captured.CallerUserId.Should().Be(42);
        captured.HasTitle.Should().BeTrue();
        captured.Title.Should().Be("Renamed");
        captured.HasDescription.Should().BeFalse();
        captured.HasLeadUserId.Should().BeFalse();
        captured.HasExpectedVersion.Should().BeFalse();
    }

    [Fact]
    public async Task Patch_DescriptionOnly_ForwardsHasDescription()
    {
        var client = ClientWithToken(ManagerToken());
        PatchFeatureRequest? captured = null;
        _factory.MockFeaturePatcher
            .PatchAsync(Arg.Do<PatchFeatureRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(FiveRowDto()));

        var response = await client.PatchAsync("/api/plan/features/1",
            JsonBody(new { description = "Set body" }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured!.HasDescription.Should().BeTrue();
        captured.Description.Should().Be("Set body");
        captured.HasTitle.Should().BeFalse();
        captured.HasLeadUserId.Should().BeFalse();
    }

    [Fact]
    public async Task Patch_LeadOnly_ValidatesRosterAndForwards()
    {
        var client = ClientWithToken(ManagerToken(userId: 1));
        StubRoster(managerUserId: 1, teammateUserIds: 7);

        PatchFeatureRequest? captured = null;
        _factory.MockFeaturePatcher
            .PatchAsync(Arg.Do<PatchFeatureRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(FiveRowDto()));

        var response = await client.PatchAsync("/api/plan/features/1",
            JsonBody(new { leadUserId = 7 }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured!.HasLeadUserId.Should().BeTrue();
        captured.LeadUserId.Should().Be(7);
    }

    [Fact]
    public async Task Patch_LeadNotOnRoster_Returns400WithRosterMessage()
    {
        var client = ClientWithToken(ManagerToken(userId: 1));
        StubRoster(managerUserId: 1, teammateUserIds: 7);

        var response = await client.PatchAsync("/api/plan/features/1",
            JsonBody(new { leadUserId = 99 }));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Pick a teammate from the list");
    }

    [Fact]
    public async Task Patch_LeadLessThanOne_Returns400()
    {
        var client = ClientWithToken(ManagerToken());

        var response = await client.PatchAsync("/api/plan/features/1",
            JsonBody(new { leadUserId = 0 }));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Patch_AllSparseFields_ForwardsAll()
    {
        var client = ClientWithToken(ManagerToken(userId: 1));
        StubRoster(managerUserId: 1, teammateUserIds: 9);

        PatchFeatureRequest? captured = null;
        _factory.MockFeaturePatcher
            .PatchAsync(Arg.Do<PatchFeatureRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(FiveRowDto()));

        var response = await client.PatchAsync("/api/plan/features/1",
            JsonBody(new
            {
                title = "T",
                description = "D",
                leadUserId = 9,
            }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured!.HasTitle.Should().BeTrue();
        captured.Title.Should().Be("T");
        captured.HasDescription.Should().BeTrue();
        captured.Description.Should().Be("D");
        captured.HasLeadUserId.Should().BeTrue();
        captured.LeadUserId.Should().Be(9);
    }

    [Fact]
    public async Task Patch_WithIfMatchHeader_ForwardsExpectedVersion()
    {
        var client = ClientWithToken(ManagerToken());
        PatchFeatureRequest? captured = null;
        _factory.MockFeaturePatcher
            .PatchAsync(Arg.Do<PatchFeatureRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(FiveRowDto()));

        var request = new HttpRequestMessage(HttpMethod.Patch, "/api/plan/features/1")
        {
            Content = JsonBody(new { title = "Renamed" })
        };
        request.Headers.TryAddWithoutValidation("If-Match", "\"3\"");

        var response = await client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured!.HasExpectedVersion.Should().BeTrue();
        captured.ExpectedVersion.Should().Be(3);
    }

    [Fact]
    public async Task Patch_BodyExpectedVersion_TakesPrecedenceOverIfMatch()
    {
        var client = ClientWithToken(ManagerToken());
        PatchFeatureRequest? captured = null;
        _factory.MockFeaturePatcher
            .PatchAsync(Arg.Do<PatchFeatureRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(FiveRowDto()));

        var request = new HttpRequestMessage(HttpMethod.Patch, "/api/plan/features/1")
        {
            Content = JsonBody(new { title = "Renamed", expectedVersion = 11 })
        };
        request.Headers.TryAddWithoutValidation("If-Match", "\"3\"");

        var response = await client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured!.HasExpectedVersion.Should().BeTrue();
        captured.ExpectedVersion.Should().Be(11);
    }

    [Fact]
    public async Task Patch_UpstreamAlreadyExists_Returns409()
    {
        var client = ClientWithToken(ManagerToken());
        _factory.MockFeaturePatcher
            .PatchAsync(Arg.Any<PatchFeatureRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(_ => throw new RpcException(
                new Status(StatusCode.AlreadyExists, "version mismatch")));

        var response = await client.PatchAsync("/api/plan/features/1",
            JsonBody(new { title = "Renamed" }));

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Patch_UpstreamNotFound_Returns404()
    {
        var client = ClientWithToken(ManagerToken());
        _factory.MockFeaturePatcher
            .PatchAsync(Arg.Any<PatchFeatureRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(_ => throw new RpcException(
                new Status(StatusCode.NotFound, "feature 999 not found")));

        var response = await client.PatchAsync("/api/plan/features/999",
            JsonBody(new { title = "Renamed" }));

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Patch_NonManagerRole_Returns403()
    {
        var client = ClientWithToken(DevToken());

        var response = await client.PatchAsync("/api/plan/features/1",
            JsonBody(new { title = "Renamed" }));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Patch_Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.PatchAsync("/api/plan/features/1",
            JsonBody(new { title = "Renamed" }));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
