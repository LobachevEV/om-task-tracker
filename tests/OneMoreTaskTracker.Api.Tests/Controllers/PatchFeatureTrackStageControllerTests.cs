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
using OneMoreTaskTracker.Proto.Features.GetFeatureQuery;
using OneMoreTaskTracker.Proto.Features.PatchFeatureTrackStageCommand;
using OneMoreTaskTracker.Proto.Users;
using Xunit;
using GetFeatureDto = OneMoreTaskTracker.Proto.Features.GetFeatureQuery.FeatureDto;
using TrackDto = OneMoreTaskTracker.Proto.Features.FeatureTrackDto;

namespace OneMoreTaskTracker.Api.Tests.Controllers;

public sealed class PatchFeatureTrackStageControllerTests(TasksControllerWebApplicationFactory factory)
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
                    Email  = "manager@example.com",
                    Role   = Roles.Manager,
                }
            }
        };
        foreach (var userId in teammateUserIds)
        {
            response.Members.Add(new TeamRosterMember
            {
                UserId    = userId,
                Email     = $"user{userId}@example.com",
                Role      = Roles.FrontendDeveloper,
                ManagerId = managerUserId,
            });
        }

        _factory.MockUserService
            .GetTeamRosterAsync(Arg.Any<GetTeamRosterRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(response));
    }

    private static GetFeatureDto MinimalFeatureDto(int id = 1, int managerUserId = 1) =>
        new()
        {
            Id            = id,
            Title         = "Feature",
            Description   = string.Empty,
            State         = FeatureState.Development,
            PlannedStart  = string.Empty,
            PlannedEnd    = string.Empty,
            LeadUserId    = managerUserId,
            ManagerUserId = managerUserId,
            CreatedAt     = DateTime.UtcNow.ToString("O"),
            UpdatedAt     = DateTime.UtcNow.ToString("O"),
            Version       = 1,
        };

    private void StubPatchAndGet(GetFeatureDto featureDto)
    {
        _factory.MockFeatureTrackStagePatcher
            .PatchAsync(Arg.Any<PatchFeatureTrackStageRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new TrackDto { Id = 1 }));

        _factory.MockFeatureGetter
            .GetAsync(Arg.Any<GetFeatureRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(featureDto));
    }

    [Fact]
    public async Task PatchTrackStage_HappyPath_Returns200()
    {
        var client = ClientWithToken(ManagerToken(userId: 1));
        StubRoster(managerUserId: 1, teammateUserIds: 7);
        StubPatchAndGet(MinimalFeatureDto(managerUserId: 1));

        var response = await client.PatchAsync(
            "/api/plan/features/1/tracks/Frontend/stages/Development",
            JsonBody(new { stageOwnerUserId = 7 }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task PatchTrackStage_NoFields_NoOp_Returns200()
    {
        var client = ClientWithToken(ManagerToken());
        StubPatchAndGet(MinimalFeatureDto());

        var response = await client.PatchAsync(
            "/api/plan/features/1/tracks/Backend/stages/Development",
            JsonBody(new { }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task PatchTrackStage_ForwardsAllSparseFields()
    {
        var client = ClientWithToken(ManagerToken(userId: 1));
        StubRoster(managerUserId: 1, teammateUserIds: 9);

        PatchFeatureTrackStageRequest? captured = null;
        _factory.MockFeatureTrackStagePatcher
            .PatchAsync(Arg.Do<PatchFeatureTrackStageRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new TrackDto { Id = 1 }));
        _factory.MockFeatureGetter
            .GetAsync(Arg.Any<GetFeatureRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(MinimalFeatureDto()));

        var response = await client.PatchAsync(
            "/api/plan/features/1/tracks/Frontend/stages/Development",
            JsonBody(new
            {
                stageOwnerUserId = 9,
                plannedStart     = "2026-05-01",
                plannedEnd       = "2026-05-31",
            }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured.Should().NotBeNull();
        captured!.Kind.Should().Be(FeatureTrackKind.Frontend);
        captured.StageKey.Should().Be(FeatureTrackStageKey.TrackStageDevelopment);
        captured.HasStageOwnerUserId.Should().BeTrue();
        captured.StageOwnerUserId.Should().Be(9);
        captured.HasPlannedStart.Should().BeTrue();
        captured.PlannedStart.Should().Be("2026-05-01");
        captured.HasPlannedEnd.Should().BeTrue();
        captured.PlannedEnd.Should().Be("2026-05-31");
    }

    [Fact]
    public async Task PatchTrackStage_WithIfMatchHeader_ForwardsExpectedStageVersion()
    {
        var client = ClientWithToken(ManagerToken());

        PatchFeatureTrackStageRequest? captured = null;
        _factory.MockFeatureTrackStagePatcher
            .PatchAsync(Arg.Do<PatchFeatureTrackStageRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new TrackDto { Id = 1 }));
        _factory.MockFeatureGetter
            .GetAsync(Arg.Any<GetFeatureRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(MinimalFeatureDto()));

        var request = new HttpRequestMessage(HttpMethod.Patch,
            "/api/plan/features/1/tracks/Frontend/stages/Development")
        {
            Content = JsonBody(new { })
        };
        request.Headers.TryAddWithoutValidation("If-Match", "\"7\"");

        var response = await client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured!.HasExpectedStageVersion.Should().BeTrue();
        captured.ExpectedStageVersion.Should().Be(7);
    }

    [Fact]
    public async Task PatchTrackStage_BodyExpectedStageVersion_TakesPrecedenceOverIfMatch()
    {
        var client = ClientWithToken(ManagerToken());

        PatchFeatureTrackStageRequest? captured = null;
        _factory.MockFeatureTrackStagePatcher
            .PatchAsync(Arg.Do<PatchFeatureTrackStageRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new TrackDto { Id = 1 }));
        _factory.MockFeatureGetter
            .GetAsync(Arg.Any<GetFeatureRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(MinimalFeatureDto()));

        var request = new HttpRequestMessage(HttpMethod.Patch,
            "/api/plan/features/1/tracks/Backend/stages/Development")
        {
            Content = JsonBody(new { expectedStageVersion = 12 })
        };
        request.Headers.TryAddWithoutValidation("If-Match", "\"7\"");

        var response = await client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured!.HasExpectedStageVersion.Should().BeTrue();
        captured.ExpectedStageVersion.Should().Be(12);
    }

    [Fact]
    public async Task PatchTrackStage_InvalidKind_Returns400()
    {
        var client = ClientWithToken(ManagerToken());

        var response = await client.PatchAsync(
            "/api/plan/features/1/tracks/NotAKind/stages/Development",
            JsonBody(new { }));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PatchTrackStage_InvalidStageKey_Returns400()
    {
        var client = ClientWithToken(ManagerToken());

        var response = await client.PatchAsync(
            "/api/plan/features/1/tracks/Frontend/stages/NotAStage",
            JsonBody(new { }));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PatchTrackStage_OwnerNotOnRoster_Returns400WithMessage()
    {
        var client = ClientWithToken(ManagerToken(userId: 1));
        StubRoster(managerUserId: 1, teammateUserIds: 7);

        var response = await client.PatchAsync(
            "/api/plan/features/1/tracks/Frontend/stages/Development",
            JsonBody(new { stageOwnerUserId = 99 }));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Pick a teammate from the list");
    }

    [Fact]
    public async Task PatchTrackStage_MalformedPlannedStart_Returns400()
    {
        var client = ClientWithToken(ManagerToken());

        var response = await client.PatchAsync(
            "/api/plan/features/1/tracks/Frontend/stages/Development",
            JsonBody(new { plannedStart = "not-a-date" }));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PatchTrackStage_MalformedPlannedEnd_Returns400()
    {
        var client = ClientWithToken(ManagerToken());

        var response = await client.PatchAsync(
            "/api/plan/features/1/tracks/Frontend/stages/Development",
            JsonBody(new { plannedEnd = "not-a-date" }));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PatchTrackStage_Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.PatchAsync(
            "/api/plan/features/1/tracks/Frontend/stages/Development",
            JsonBody(new { }));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task PatchTrackStage_NonManagerRole_Returns403()
    {
        var client = ClientWithToken(DevToken());

        var response = await client.PatchAsync(
            "/api/plan/features/1/tracks/Frontend/stages/Development",
            JsonBody(new { }));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task PatchTrackStage_UpstreamNotFound_Returns404()
    {
        var client = ClientWithToken(ManagerToken());
        _factory.MockFeatureTrackStagePatcher
            .PatchAsync(Arg.Any<PatchFeatureTrackStageRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(_ => throw new RpcException(new Status(StatusCode.NotFound, "feature 999 not found")));

        var response = await client.PatchAsync(
            "/api/plan/features/999/tracks/Frontend/stages/Development",
            JsonBody(new { }));

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task PatchTrackStage_UpstreamPermissionDenied_Returns403()
    {
        var client = ClientWithToken(ManagerToken());
        _factory.MockFeatureTrackStagePatcher
            .PatchAsync(Arg.Any<PatchFeatureTrackStageRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(_ => throw new RpcException(new Status(StatusCode.PermissionDenied, "Not the feature owner")));

        var response = await client.PatchAsync(
            "/api/plan/features/1/tracks/Frontend/stages/Development",
            JsonBody(new { }));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task PatchTrackStage_UpstreamAlreadyExists_Returns409()
    {
        var client = ClientWithToken(ManagerToken());
        _factory.MockFeatureTrackStagePatcher
            .PatchAsync(Arg.Any<PatchFeatureTrackStageRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(_ => throw new RpcException(new Status(StatusCode.AlreadyExists, "stage version mismatch")));

        var response = await client.PatchAsync(
            "/api/plan/features/1/tracks/Frontend/stages/Development",
            JsonBody(new { }));

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task PatchTrackStage_UpstreamFailedPrecondition_Returns422()
    {
        var client = ClientWithToken(ManagerToken());
        _factory.MockFeatureTrackStagePatcher
            .PatchAsync(Arg.Any<PatchFeatureTrackStageRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(_ => throw new RpcException(
                new Status(StatusCode.FailedPrecondition, "Stage order violation|conflict={}")));

        var response = await client.PatchAsync(
            "/api/plan/features/1/tracks/Frontend/stages/Development",
            JsonBody(new { plannedStart = "2026-06-01" }));

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
    }

    [Fact]
    public async Task PatchTrackStage_BackendTrackWithSrApproving_Returns400()
    {
        var client = ClientWithToken(ManagerToken());
        _factory.MockFeatureTrackStagePatcher
            .PatchAsync(Arg.Any<PatchFeatureTrackStageRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(_ => throw new RpcException(
                new Status(StatusCode.InvalidArgument, "stage_key SrApproving is not valid for kind Backend")));

        var response = await client.PatchAsync(
            "/api/plan/features/1/tracks/Backend/stages/SrApproving",
            JsonBody(new { }));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PatchTrackStage_FrontendTrackWithCsApproving_Returns400()
    {
        var client = ClientWithToken(ManagerToken());
        _factory.MockFeatureTrackStagePatcher
            .PatchAsync(Arg.Any<PatchFeatureTrackStageRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(_ => throw new RpcException(
                new Status(StatusCode.InvalidArgument, "stage_key CsApproving is not valid for kind Frontend")));

        var response = await client.PatchAsync(
            "/api/plan/features/1/tracks/Frontend/stages/CsApproving",
            JsonBody(new { }));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
