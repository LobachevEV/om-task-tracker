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
using OneMoreTaskTracker.Proto.Features.PatchFeatureTrackCommand;
using OneMoreTaskTracker.Proto.Users;
using Xunit;
using GetFeatureDto = OneMoreTaskTracker.Proto.Features.GetFeatureQuery.FeatureDto;
using TrackDto = OneMoreTaskTracker.Proto.Features.FeatureTrackDto;

namespace OneMoreTaskTracker.Api.Tests.Controllers;

public sealed class PatchFeatureTrackControllerTests(TasksControllerWebApplicationFactory factory)
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

        var members = new HashSet<int>(teammateUserIds) { managerUserId };
        _factory.MockUserService
            .IsTeamMemberAsync(
                Arg.Is<IsTeamMemberRequest>(r => members.Contains(r.MemberUserId)),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new IsTeamMemberResponse { IsMember = true }));
        _factory.MockUserService
            .IsTeamMemberAsync(
                Arg.Is<IsTeamMemberRequest>(r => !members.Contains(r.MemberUserId)),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new IsTeamMemberResponse { IsMember = false }));
    }

    private static GetFeatureDto MinimalFeatureDto(int id = 1, int managerUserId = 1)
    {
        var dto = new GetFeatureDto
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
        dto.Tracks.Add(new TrackDto { Id = 1, FeatureId = id, Kind = FeatureTrackKind.Frontend, TrackOwnerUserId = managerUserId, Version = 1 });
        dto.Tracks.Add(new TrackDto { Id = 2, FeatureId = id, Kind = FeatureTrackKind.Backend,  TrackOwnerUserId = managerUserId, Version = 1 });
        return dto;
    }

    private void StubPatchAndGet(GetFeatureDto featureDto)
    {
        _factory.MockFeatureTrackPatcher
            .PatchAsync(Arg.Any<PatchFeatureTrackRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new TrackDto { Id = 1 }));

        _factory.MockFeatureGetter
            .GetAsync(Arg.Any<GetFeatureRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(featureDto));
    }

    [Fact]
    public async Task PatchTrack_HappyPath_Returns200()
    {
        var client = ClientWithToken(ManagerToken(userId: 1));
        StubRoster(managerUserId: 1, teammateUserIds: 7);
        StubPatchAndGet(MinimalFeatureDto(managerUserId: 1));

        var response = await client.PatchAsync(
            "/api/plan/features/1/tracks/Frontend",
            JsonBody(new { trackOwnerUserId = 7 }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task PatchTrack_NoFields_NoOp_Returns200()
    {
        var client = ClientWithToken(ManagerToken());
        StubPatchAndGet(MinimalFeatureDto());

        var response = await client.PatchAsync(
            "/api/plan/features/1/tracks/Backend",
            JsonBody(new { }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task PatchTrack_ForwardsCallerUserIdFromToken()
    {
        var client = ClientWithToken(ManagerToken(userId: 42));
        StubRoster(managerUserId: 42, teammateUserIds: 7);

        PatchFeatureTrackRequest? captured = null;
        _factory.MockFeatureTrackPatcher
            .PatchAsync(Arg.Do<PatchFeatureTrackRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new TrackDto { Id = 1 }));
        _factory.MockFeatureGetter
            .GetAsync(Arg.Any<GetFeatureRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(MinimalFeatureDto(managerUserId: 42)));

        var response = await client.PatchAsync(
            "/api/plan/features/1/tracks/Frontend",
            JsonBody(new { trackOwnerUserId = 7 }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured.Should().NotBeNull();
        captured!.CallerUserId.Should().Be(42);
        captured.Kind.Should().Be(FeatureTrackKind.Frontend);
        captured.HasTrackOwnerUserId.Should().BeTrue();
        captured.TrackOwnerUserId.Should().Be(7);
    }

    [Fact]
    public async Task PatchTrack_WithIfMatchHeader_ForwardsExpectedVersion()
    {
        var client = ClientWithToken(ManagerToken());

        PatchFeatureTrackRequest? captured = null;
        _factory.MockFeatureTrackPatcher
            .PatchAsync(Arg.Do<PatchFeatureTrackRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new TrackDto { Id = 1 }));
        _factory.MockFeatureGetter
            .GetAsync(Arg.Any<GetFeatureRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(MinimalFeatureDto()));

        var request = new HttpRequestMessage(HttpMethod.Patch, "/api/plan/features/1/tracks/Frontend")
        {
            Content = JsonBody(new { })
        };
        request.Headers.TryAddWithoutValidation("If-Match", "\"3\"");

        var response = await client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured!.HasExpectedVersion.Should().BeTrue();
        captured.ExpectedVersion.Should().Be(3);
    }

    [Fact]
    public async Task PatchTrack_BodyExpectedVersion_TakesPrecedenceOverIfMatch()
    {
        var client = ClientWithToken(ManagerToken());

        PatchFeatureTrackRequest? captured = null;
        _factory.MockFeatureTrackPatcher
            .PatchAsync(Arg.Do<PatchFeatureTrackRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new TrackDto { Id = 1 }));
        _factory.MockFeatureGetter
            .GetAsync(Arg.Any<GetFeatureRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(MinimalFeatureDto()));

        var request = new HttpRequestMessage(HttpMethod.Patch, "/api/plan/features/1/tracks/Backend")
        {
            Content = JsonBody(new { expectedVersion = 9 })
        };
        request.Headers.TryAddWithoutValidation("If-Match", "\"3\"");

        var response = await client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured!.HasExpectedVersion.Should().BeTrue();
        captured.ExpectedVersion.Should().Be(9);
    }

    [Fact]
    public async Task PatchTrack_InvalidKind_Returns400()
    {
        var client = ClientWithToken(ManagerToken());

        var response = await client.PatchAsync(
            "/api/plan/features/1/tracks/NotAKind",
            JsonBody(new { }));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PatchTrack_OwnerLessThanOne_Returns400()
    {
        var client = ClientWithToken(ManagerToken());

        var response = await client.PatchAsync(
            "/api/plan/features/1/tracks/Frontend",
            JsonBody(new { trackOwnerUserId = 0 }));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PatchTrack_OwnerNotOnRoster_Returns400WithMessage()
    {
        var client = ClientWithToken(ManagerToken(userId: 1));
        StubRoster(managerUserId: 1, teammateUserIds: 7);

        var response = await client.PatchAsync(
            "/api/plan/features/1/tracks/Frontend",
            JsonBody(new { trackOwnerUserId = 99 }));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Pick a teammate from the list");
    }

    [Fact]
    public async Task PatchTrack_Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.PatchAsync(
            "/api/plan/features/1/tracks/Frontend",
            JsonBody(new { }));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task PatchTrack_NonManagerRole_Returns403()
    {
        var client = ClientWithToken(DevToken());

        var response = await client.PatchAsync(
            "/api/plan/features/1/tracks/Frontend",
            JsonBody(new { }));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task PatchTrack_UpstreamNotFound_Returns404()
    {
        var client = ClientWithToken(ManagerToken());
        _factory.MockFeatureTrackPatcher
            .PatchAsync(Arg.Any<PatchFeatureTrackRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(_ => throw new RpcException(new Status(StatusCode.NotFound, "feature 999 not found")));

        var response = await client.PatchAsync(
            "/api/plan/features/999/tracks/Frontend",
            JsonBody(new { }));

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task PatchTrack_UpstreamPermissionDenied_Returns403()
    {
        var client = ClientWithToken(ManagerToken());
        _factory.MockFeatureTrackPatcher
            .PatchAsync(Arg.Any<PatchFeatureTrackRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(_ => throw new RpcException(new Status(StatusCode.PermissionDenied, "Not the feature owner")));

        var response = await client.PatchAsync(
            "/api/plan/features/1/tracks/Frontend",
            JsonBody(new { }));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task PatchTrack_UpstreamAlreadyExists_Returns409()
    {
        var client = ClientWithToken(ManagerToken());
        _factory.MockFeatureTrackPatcher
            .PatchAsync(Arg.Any<PatchFeatureTrackRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(_ => throw new RpcException(new Status(StatusCode.AlreadyExists, "track version mismatch")));

        var response = await client.PatchAsync(
            "/api/plan/features/1/tracks/Frontend",
            JsonBody(new { }));

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task PatchTrack_ResponseBody_IsFeatureTrackShape_NotFeatureSummary()
    {
        var client = ClientWithToken(ManagerToken());

        var featureDto = MinimalFeatureDto();
        featureDto.Tracks.Add(new TrackDto
        {
            Id                = 10,
            FeatureId         = 1,
            Kind              = FeatureTrackKind.Backend,
            TrackOwnerUserId  = 1,
            Version           = 2,
        });
        StubPatchAndGet(featureDto);

        var response = await client.PatchAsync(
            "/api/plan/features/1/tracks/Backend",
            JsonBody(new { }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadAsStringAsync();
        using var doc = System.Text.Json.JsonDocument.Parse(body);
        var root = doc.RootElement;

        root.TryGetProperty("kind", out _).Should().BeTrue("response must expose 'kind'");
        root.TryGetProperty("stages", out _).Should().BeTrue("response must expose 'stages'");
        root.TryGetProperty("featureId", out _).Should().BeTrue("response must expose 'featureId'");
        root.TryGetProperty("tracks", out _).Should().BeFalse("response must NOT be FeatureSummary (no 'tracks' envelope)");
    }
}
