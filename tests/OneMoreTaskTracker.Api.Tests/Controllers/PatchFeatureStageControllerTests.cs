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
using OneMoreTaskTracker.Proto.Features.PatchFeatureStageCommand;
using OneMoreTaskTracker.Proto.Users;
using Xunit;
using PatchFeatureStageDto = OneMoreTaskTracker.Proto.Features.PatchFeatureStageCommand.FeatureDto;

namespace OneMoreTaskTracker.Api.Tests.Controllers;

public sealed class PatchFeatureStageControllerTests(TasksControllerWebApplicationFactory factory)
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

    private static FeatureStagePlan ProtoPlan(FeatureState stage, int version = 0) =>
        new()
        {
            Stage = stage,
            PlannedStart = string.Empty,
            PlannedEnd = string.Empty,
            PerformerUserId = 0,
            Version = version,
        };

    private static PatchFeatureStageDto FiveRowDto(int id = 1, int managerUserId = 1, int leadUserId = 1) =>
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
            Version = 3,
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
    public async Task PatchStage_OwnerOnly_ForwardsHasFlagAndValue()
    {
        var client = ClientWithToken(ManagerToken(userId: 42));
        StubRoster(managerUserId: 42, teammateUserIds: 7);

        PatchFeatureStageRequest? captured = null;
        _factory.MockFeatureStagePatcher
            .PatchAsync(Arg.Do<PatchFeatureStageRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(FiveRowDto(managerUserId: 42)));

        var response = await client.PatchAsync(
            "/api/plan/features/1/stages/Development",
            JsonBody(new { stageOwnerUserId = 7 }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured.Should().NotBeNull();
        captured!.FeatureId.Should().Be(1);
        captured.Stage.Should().Be(FeatureState.Development);
        captured.CallerUserId.Should().Be(42);
        captured.HasStageOwnerUserId.Should().BeTrue();
        captured.StageOwnerUserId.Should().Be(7);
        captured.HasPlannedStart.Should().BeFalse();
        captured.HasPlannedEnd.Should().BeFalse();
        captured.HasExpectedStageVersion.Should().BeFalse();
    }

    [Fact]
    public async Task PatchStage_PlannedStartOnly_ForwardsHasFlagAndValue()
    {
        var client = ClientWithToken(ManagerToken());
        PatchFeatureStageRequest? captured = null;
        _factory.MockFeatureStagePatcher
            .PatchAsync(Arg.Do<PatchFeatureStageRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(FiveRowDto()));

        var response = await client.PatchAsync(
            "/api/plan/features/1/stages/Development",
            JsonBody(new { plannedStart = "2026-05-01" }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured!.HasPlannedStart.Should().BeTrue();
        captured.PlannedStart.Should().Be("2026-05-01");
        captured.HasStageOwnerUserId.Should().BeFalse();
        captured.HasPlannedEnd.Should().BeFalse();
    }

    [Fact]
    public async Task PatchStage_PlannedEndOnly_ForwardsHasFlagAndValue()
    {
        var client = ClientWithToken(ManagerToken());
        PatchFeatureStageRequest? captured = null;
        _factory.MockFeatureStagePatcher
            .PatchAsync(Arg.Do<PatchFeatureStageRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(FiveRowDto()));

        var response = await client.PatchAsync(
            "/api/plan/features/1/stages/Development",
            JsonBody(new { plannedEnd = "2026-06-01" }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured!.HasPlannedEnd.Should().BeTrue();
        captured.PlannedEnd.Should().Be("2026-06-01");
        captured.HasPlannedStart.Should().BeFalse();
    }

    [Fact]
    public async Task PatchStage_AllSparseFields_ForwardsAll()
    {
        var client = ClientWithToken(ManagerToken(userId: 1));
        StubRoster(managerUserId: 1, teammateUserIds: 9);

        PatchFeatureStageRequest? captured = null;
        _factory.MockFeatureStagePatcher
            .PatchAsync(Arg.Do<PatchFeatureStageRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(FiveRowDto()));

        var response = await client.PatchAsync(
            "/api/plan/features/1/stages/Testing",
            JsonBody(new
            {
                stageOwnerUserId = 9,
                plannedStart = "2026-05-15",
                plannedEnd = "2026-05-30",
            }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured!.Stage.Should().Be(FeatureState.Testing);
        captured.HasStageOwnerUserId.Should().BeTrue();
        captured.StageOwnerUserId.Should().Be(9);
        captured.HasPlannedStart.Should().BeTrue();
        captured.PlannedStart.Should().Be("2026-05-15");
        captured.HasPlannedEnd.Should().BeTrue();
        captured.PlannedEnd.Should().Be("2026-05-30");
    }

    [Fact]
    public async Task PatchStage_NoFields_NoOp_StillCallsUpstream()
    {
        var client = ClientWithToken(ManagerToken());
        PatchFeatureStageRequest? captured = null;
        _factory.MockFeatureStagePatcher
            .PatchAsync(Arg.Do<PatchFeatureStageRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(FiveRowDto()));

        var response = await client.PatchAsync(
            "/api/plan/features/1/stages/Development",
            JsonBody(new { }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured!.HasStageOwnerUserId.Should().BeFalse();
        captured.HasPlannedStart.Should().BeFalse();
        captured.HasPlannedEnd.Should().BeFalse();
        captured.HasExpectedStageVersion.Should().BeFalse();
    }

    [Fact]
    public async Task PatchStage_WithIfMatchHeader_ForwardsExpectedStageVersion()
    {
        var client = ClientWithToken(ManagerToken());
        PatchFeatureStageRequest? captured = null;
        _factory.MockFeatureStagePatcher
            .PatchAsync(Arg.Do<PatchFeatureStageRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(FiveRowDto()));

        var request = new HttpRequestMessage(HttpMethod.Patch,
            "/api/plan/features/1/stages/Development")
        {
            Content = JsonBody(new { plannedStart = "2026-05-01" })
        };
        request.Headers.TryAddWithoutValidation("If-Match", "\"5\"");

        var response = await client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured!.HasExpectedStageVersion.Should().BeTrue();
        captured.ExpectedStageVersion.Should().Be(5);
    }

    [Fact]
    public async Task PatchStage_BodyExpectedStageVersion_TakesPrecedenceOverIfMatch()
    {
        var client = ClientWithToken(ManagerToken());
        PatchFeatureStageRequest? captured = null;
        _factory.MockFeatureStagePatcher
            .PatchAsync(Arg.Do<PatchFeatureStageRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(FiveRowDto()));

        var request = new HttpRequestMessage(HttpMethod.Patch,
            "/api/plan/features/1/stages/Development")
        {
            Content = JsonBody(new { plannedStart = "2026-05-01", expectedStageVersion = 11 })
        };
        request.Headers.TryAddWithoutValidation("If-Match", "\"5\"");

        var response = await client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured!.HasExpectedStageVersion.Should().BeTrue();
        captured.ExpectedStageVersion.Should().Be(11);
    }

    [Fact]
    public async Task PatchStage_OwnerNotOnRoster_Returns400WithRosterMessage()
    {
        var client = ClientWithToken(ManagerToken(userId: 1));
        StubRoster(managerUserId: 1, teammateUserIds: 7);

        var response = await client.PatchAsync(
            "/api/plan/features/1/stages/Development",
            JsonBody(new { stageOwnerUserId = 99 }));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Pick a teammate from the list");
    }

    [Fact]
    public async Task PatchStage_OwnerLessThanOne_Returns400()
    {
        var client = ClientWithToken(ManagerToken());

        var response = await client.PatchAsync(
            "/api/plan/features/1/stages/Development",
            JsonBody(new { stageOwnerUserId = 0 }));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PatchStage_MalformedPlannedStart_Returns400()
    {
        var client = ClientWithToken(ManagerToken());

        var response = await client.PatchAsync(
            "/api/plan/features/1/stages/Development",
            JsonBody(new { plannedStart = "not-a-date" }));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PatchStage_MalformedPlannedEnd_Returns400()
    {
        var client = ClientWithToken(ManagerToken());

        var response = await client.PatchAsync(
            "/api/plan/features/1/stages/Development",
            JsonBody(new { plannedEnd = "not-a-date" }));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PatchStage_UnknownStageSegment_Returns400()
    {
        var client = ClientWithToken(ManagerToken());

        var response = await client.PatchAsync(
            "/api/plan/features/1/stages/NotAStage",
            JsonBody(new { plannedStart = "2026-05-01" }));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PatchStage_UpstreamAlreadyExists_Returns409()
    {
        var client = ClientWithToken(ManagerToken());
        _factory.MockFeatureStagePatcher
            .PatchAsync(Arg.Any<PatchFeatureStageRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(_ => throw new RpcException(
                new Status(StatusCode.AlreadyExists, "stage version mismatch")));

        var response = await client.PatchAsync(
            "/api/plan/features/1/stages/Development",
            JsonBody(new { plannedStart = "2026-05-01" }));

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task PatchStage_UpstreamNotFound_Returns404()
    {
        var client = ClientWithToken(ManagerToken());
        _factory.MockFeatureStagePatcher
            .PatchAsync(Arg.Any<PatchFeatureStageRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(_ => throw new RpcException(
                new Status(StatusCode.NotFound, "feature 999 not found")));

        var response = await client.PatchAsync(
            "/api/plan/features/999/stages/Development",
            JsonBody(new { plannedStart = "2026-05-01" }));

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task PatchStage_UpstreamPermissionDenied_Returns403()
    {
        var client = ClientWithToken(ManagerToken());
        _factory.MockFeatureStagePatcher
            .PatchAsync(Arg.Any<PatchFeatureStageRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(_ => throw new RpcException(
                new Status(StatusCode.PermissionDenied, "Not the feature owner")));

        var response = await client.PatchAsync(
            "/api/plan/features/1/stages/Development",
            JsonBody(new { plannedStart = "2026-05-01" }));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task PatchStage_NonManagerRole_Returns403()
    {
        var client = ClientWithToken(DevToken());

        var response = await client.PatchAsync(
            "/api/plan/features/1/stages/Development",
            JsonBody(new { plannedStart = "2026-05-01" }));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task PatchStage_Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.PatchAsync(
            "/api/plan/features/1/stages/Development",
            JsonBody(new { plannedStart = "2026-05-01" }));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
