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
using OneMoreTaskTracker.Proto.Features.UpdateFeatureDescriptionCommand;
using OneMoreTaskTracker.Proto.Features.UpdateFeatureTitleCommand;
using OneMoreTaskTracker.Proto.Features.UpdateStageOwnerCommand;
using OneMoreTaskTracker.Proto.Features.UpdateStagePlannedEndCommand;
using OneMoreTaskTracker.Proto.Features.UpdateStagePlannedStartCommand;
using OneMoreTaskTracker.Proto.Users;
using Xunit;
using UpdateFeatureTitleDto = OneMoreTaskTracker.Proto.Features.UpdateFeatureTitleCommand.FeatureDto;
using UpdateFeatureDescriptionDto = OneMoreTaskTracker.Proto.Features.UpdateFeatureDescriptionCommand.FeatureDto;
using UpdateStageOwnerDto = OneMoreTaskTracker.Proto.Features.UpdateStageOwnerCommand.FeatureDto;
using UpdateStagePlannedStartDto = OneMoreTaskTracker.Proto.Features.UpdateStagePlannedStartCommand.FeatureDto;
using UpdateStagePlannedEndDto = OneMoreTaskTracker.Proto.Features.UpdateStagePlannedEndCommand.FeatureDto;

namespace OneMoreTaskTracker.Api.Tests.Controllers;

// Gateway-level integration tests for the five per-field inline-edit PATCH
// endpoints. Covers:
//   - happy path per endpoint (200 + forwarded proto request shape)
//   - unauthenticated (401) and non-manager role (403)
//   - malformed payloads (400) — empty title, unknown stage, negative owner id
//   - upstream PermissionDenied bubbles through the gateway middleware as 403
//   - If-Match header forwarding
public sealed class InlineEditEndpointsTests(TasksControllerWebApplicationFactory factory)
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

    // Roster stub used by UpdateStageOwner (gateway-side roster membership
    // defense per api-contract.md §3). Returns a roster containing the
    // manager + the listed teammate ids as simple members.
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

    private static UpdateFeatureTitleDto TitleDto(int id = 1, int managerUserId = 1, int version = 1) =>
        new()
        {
            Id = id,
            Title = "Renamed",
            Description = string.Empty,
            State = FeatureState.Development,
            PlannedStart = string.Empty,
            PlannedEnd = string.Empty,
            LeadUserId = 1,
            ManagerUserId = managerUserId,
            CreatedAt = DateTime.UtcNow.ToString("O"),
            UpdatedAt = DateTime.UtcNow.ToString("O"),
            Version = version,
            StagePlans =
            {
                ProtoPlan(FeatureState.CsApproving),
                ProtoPlan(FeatureState.Development),
                ProtoPlan(FeatureState.Testing),
                ProtoPlan(FeatureState.EthalonTesting),
                ProtoPlan(FeatureState.LiveRelease),
            }
        };

    // -------- Title --------

    [Fact]
    public async Task UpdateTitle_HappyPath_Returns200AndForwardsCallerId()
    {
        // Arrange
        var client = ClientWithToken(ManagerToken(userId: 42));
        UpdateFeatureTitleRequest? captured = null;
        _factory.MockFeatureTitleUpdater
            .UpdateAsync(Arg.Do<UpdateFeatureTitleRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(TitleDto(managerUserId: 42)));

        // Act
        var response = await client.PatchAsync("/api/plan/features/1/title",
            JsonBody(new { title = "Renamed" }));

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured.Should().NotBeNull();
        captured!.CallerUserId.Should().Be(42);
        captured.Title.Should().Be("Renamed");

        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("\"version\":1");
    }

    [Fact]
    public async Task UpdateTitle_WithIfMatchHeader_ForwardsExpectedVersion()
    {
        var client = ClientWithToken(ManagerToken());
        UpdateFeatureTitleRequest? captured = null;
        _factory.MockFeatureTitleUpdater
            .UpdateAsync(Arg.Do<UpdateFeatureTitleRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(TitleDto()));

        var request = new HttpRequestMessage(HttpMethod.Patch, "/api/plan/features/1/title")
        {
            Content = JsonBody(new { title = "Renamed" })
        };
        // RFC 7232 strong ETag grammar requires quoted-string syntax; the
        // gateway's ParseIfMatch strips surrounding quotes so either form works
        // server-side, but HttpClient validates the header per the spec.
        request.Headers.TryAddWithoutValidation("If-Match", "\"7\"");

        var response = await client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured!.ExpectedVersion.Should().Be(7);
    }

    [Fact]
    public async Task UpdateTitle_EmptyTitle_Returns400()
    {
        var client = ClientWithToken(ManagerToken());

        var response = await client.PatchAsync("/api/plan/features/1/title",
            JsonBody(new { title = "" }));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdateTitle_Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.PatchAsync("/api/plan/features/1/title",
            JsonBody(new { title = "X" }));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task UpdateTitle_NonManagerRole_Returns403()
    {
        var client = ClientWithToken(DevToken());

        var response = await client.PatchAsync("/api/plan/features/1/title",
            JsonBody(new { title = "X" }));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task UpdateTitle_UpstreamPermissionDenied_Returns403()
    {
        var client = ClientWithToken(ManagerToken(userId: 42));
        _factory.MockFeatureTitleUpdater
            .UpdateAsync(Arg.Any<UpdateFeatureTitleRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(_ => throw new RpcException(new Status(StatusCode.PermissionDenied, "Not the feature owner")));

        var response = await client.PatchAsync("/api/plan/features/1/title",
            JsonBody(new { title = "Pwned" }));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task UpdateTitle_UpstreamNotFound_Returns404()
    {
        var client = ClientWithToken(ManagerToken());
        _factory.MockFeatureTitleUpdater
            .UpdateAsync(Arg.Any<UpdateFeatureTitleRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(_ => throw new RpcException(new Status(StatusCode.NotFound, "feature 1 not found")));

        var response = await client.PatchAsync("/api/plan/features/999/title",
            JsonBody(new { title = "X" }));

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UpdateTitle_UpstreamAlreadyExists_Returns409()
    {
        var client = ClientWithToken(ManagerToken());
        _factory.MockFeatureTitleUpdater
            .UpdateAsync(Arg.Any<UpdateFeatureTitleRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(_ => throw new RpcException(new Status(StatusCode.AlreadyExists, "version mismatch")));

        var response = await client.PatchAsync("/api/plan/features/1/title",
            JsonBody(new { title = "X" }));

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    // -------- Description --------

    [Fact]
    public async Task UpdateDescription_HappyPath_Returns200()
    {
        var client = ClientWithToken(ManagerToken());
        UpdateFeatureDescriptionRequest? captured = null;
        _factory.MockFeatureDescriptionUpdater
            .UpdateAsync(Arg.Do<UpdateFeatureDescriptionRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new UpdateFeatureDescriptionDto
            {
                Id = 1,
                Title = "X",
                Description = "Set",
                State = FeatureState.Development,
                PlannedStart = string.Empty,
                PlannedEnd = string.Empty,
                LeadUserId = 1,
                ManagerUserId = 1,
                CreatedAt = DateTime.UtcNow.ToString("O"),
                UpdatedAt = DateTime.UtcNow.ToString("O"),
                Version = 2,
                StagePlans =
                {
                    ProtoPlan(FeatureState.CsApproving),
                    ProtoPlan(FeatureState.Development),
                    ProtoPlan(FeatureState.Testing),
                    ProtoPlan(FeatureState.EthalonTesting),
                    ProtoPlan(FeatureState.LiveRelease),
                }
            }));

        var response = await client.PatchAsync("/api/plan/features/1/description",
            JsonBody(new { description = "Set" }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured!.Description.Should().Be("Set");
    }

    [Fact]
    public async Task UpdateDescription_NullBody_CoercesToEmptyStringOnWire()
    {
        var client = ClientWithToken(ManagerToken());
        UpdateFeatureDescriptionRequest? captured = null;
        _factory.MockFeatureDescriptionUpdater
            .UpdateAsync(Arg.Do<UpdateFeatureDescriptionRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new UpdateFeatureDescriptionDto
            {
                Id = 1,
                Title = "X",
                Description = string.Empty,
                State = FeatureState.Development,
                PlannedStart = string.Empty,
                PlannedEnd = string.Empty,
                LeadUserId = 1,
                ManagerUserId = 1,
                CreatedAt = DateTime.UtcNow.ToString("O"),
                UpdatedAt = DateTime.UtcNow.ToString("O"),
                Version = 1,
                StagePlans =
                {
                    ProtoPlan(FeatureState.CsApproving),
                    ProtoPlan(FeatureState.Development),
                    ProtoPlan(FeatureState.Testing),
                    ProtoPlan(FeatureState.EthalonTesting),
                    ProtoPlan(FeatureState.LiveRelease),
                }
            }));

        var response = await client.PatchAsync("/api/plan/features/1/description",
            JsonBody(new { description = (string?)null }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured!.Description.Should().BeEmpty();
    }

    [Fact]
    public async Task UpdateDescription_Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.PatchAsync("/api/plan/features/1/description",
            JsonBody(new { description = "X" }));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // -------- Stage Owner --------

    [Fact]
    public async Task UpdateStageOwner_HappyPath_ForwardsProtoStageAndOwner()
    {
        var client = ClientWithToken(ManagerToken());
        StubRoster(1, 42);
        UpdateStageOwnerRequest? captured = null;
        _factory.MockStageOwnerUpdater
            .UpdateAsync(Arg.Do<UpdateStageOwnerRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new UpdateStageOwnerDto
            {
                Id = 1,
                Title = "X",
                Description = string.Empty,
                State = FeatureState.Development,
                PlannedStart = string.Empty,
                PlannedEnd = string.Empty,
                LeadUserId = 1,
                ManagerUserId = 1,
                CreatedAt = DateTime.UtcNow.ToString("O"),
                UpdatedAt = DateTime.UtcNow.ToString("O"),
                Version = 2,
                StagePlans =
                {
                    ProtoPlan(FeatureState.CsApproving),
                    new FeatureStagePlan { Stage = FeatureState.Development, PlannedStart = "", PlannedEnd = "", PerformerUserId = 42, Version = 1 },
                    ProtoPlan(FeatureState.Testing),
                    ProtoPlan(FeatureState.EthalonTesting),
                    ProtoPlan(FeatureState.LiveRelease),
                }
            }));

        var response = await client.PatchAsync("/api/plan/features/1/stages/Development/owner",
            JsonBody(new { stageOwnerUserId = 42 }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured!.FeatureId.Should().Be(1);
        captured.Stage.Should().Be(FeatureState.Development);
        captured.StageOwnerUserId.Should().Be(42);

        var body = await response.Content.ReadAsStringAsync();
        // stageVersion is exposed on the stagePlans[] entries in FeatureSummary.
        body.Should().Contain("\"stageVersion\":1");
    }

    [Fact]
    public async Task UpdateStageOwner_NullOwner_ForwardsZeroOnWire()
    {
        var client = ClientWithToken(ManagerToken());
        UpdateStageOwnerRequest? captured = null;
        _factory.MockStageOwnerUpdater
            .UpdateAsync(Arg.Do<UpdateStageOwnerRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new UpdateStageOwnerDto
            {
                Id = 1,
                Title = "X",
                Description = string.Empty,
                State = FeatureState.Development,
                PlannedStart = string.Empty,
                PlannedEnd = string.Empty,
                LeadUserId = 1,
                ManagerUserId = 1,
                CreatedAt = DateTime.UtcNow.ToString("O"),
                UpdatedAt = DateTime.UtcNow.ToString("O"),
                Version = 2,
                StagePlans =
                {
                    ProtoPlan(FeatureState.CsApproving),
                    ProtoPlan(FeatureState.Development),
                    ProtoPlan(FeatureState.Testing),
                    ProtoPlan(FeatureState.EthalonTesting),
                    ProtoPlan(FeatureState.LiveRelease),
                }
            }));

        var response = await client.PatchAsync("/api/plan/features/1/stages/Development/owner",
            JsonBody(new { stageOwnerUserId = (int?)null }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured!.StageOwnerUserId.Should().Be(0);
    }

    [Fact]
    public async Task UpdateStageOwner_UnknownStage_Returns400()
    {
        var client = ClientWithToken(ManagerToken());

        var response = await client.PatchAsync("/api/plan/features/1/stages/Nonsense/owner",
            JsonBody(new { stageOwnerUserId = 42 }));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdateStageOwner_NegativeOwnerId_Returns400()
    {
        var client = ClientWithToken(ManagerToken());

        // Gateway-side reject: 0 means "unassign" via `null`; an explicit
        // negative id is malformed.
        var response = await client.PatchAsync("/api/plan/features/1/stages/Development/owner",
            JsonBody(new { stageOwnerUserId = -5 }));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdateStageOwner_Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.PatchAsync("/api/plan/features/1/stages/Development/owner",
            JsonBody(new { stageOwnerUserId = 1 }));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task UpdateStageOwner_IdNotOnRoster_Returns400WithRosterMessage()
    {
        // api-contract.md §3: positive stageOwnerUserId MUST be on the caller's
        // roster. Gateway fails fast with "Pick a teammate from the list" and
        // never reaches the Features service (closes the rogue-id attack).
        var client = ClientWithToken(ManagerToken(userId: 1));
        StubRoster(1, 2, 3);
        // The substitute is shared across tests via IClassFixture; scope the
        // "no call was made" assertion to this test's invocations only.
        _factory.MockStageOwnerUpdater.ClearReceivedCalls();

        var response = await client.PatchAsync("/api/plan/features/1/stages/Development/owner",
            JsonBody(new { stageOwnerUserId = 999 }));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Pick a teammate from the list");

        // Features service must NOT have been invoked for a failed roster check.
        _factory.MockStageOwnerUpdater.DidNotReceive().UpdateAsync(
            Arg.Any<UpdateStageOwnerRequest>(),
            Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task UpdateStageOwner_IdOnRoster_CallsFeaturesService()
    {
        var client = ClientWithToken(ManagerToken(userId: 1));
        StubRoster(1, 2, 3, 7);
        UpdateStageOwnerRequest? captured = null;
        _factory.MockStageOwnerUpdater
            .UpdateAsync(Arg.Do<UpdateStageOwnerRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new UpdateStageOwnerDto
            {
                Id = 1,
                Title = "X",
                Description = string.Empty,
                State = FeatureState.Development,
                PlannedStart = string.Empty,
                PlannedEnd = string.Empty,
                LeadUserId = 1,
                ManagerUserId = 1,
                CreatedAt = DateTime.UtcNow.ToString("O"),
                UpdatedAt = DateTime.UtcNow.ToString("O"),
                Version = 2,
                StagePlans =
                {
                    ProtoPlan(FeatureState.CsApproving),
                    new FeatureStagePlan { Stage = FeatureState.Development, PlannedStart = "", PlannedEnd = "", PerformerUserId = 7, Version = 1 },
                    ProtoPlan(FeatureState.Testing),
                    ProtoPlan(FeatureState.EthalonTesting),
                    ProtoPlan(FeatureState.LiveRelease),
                }
            }));

        var response = await client.PatchAsync("/api/plan/features/1/stages/Development/owner",
            JsonBody(new { stageOwnerUserId = 7 }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured!.StageOwnerUserId.Should().Be(7);
    }

    [Fact]
    public async Task UpdateStageOwner_NullOwner_SkipsRosterCheckAndClears()
    {
        // Clearing the assignment (null) MUST not require a roster call —
        // there's nothing to verify. Stub the roster with zero teammates; the
        // Features service still receives stageOwnerUserId=0.
        var client = ClientWithToken(ManagerToken(userId: 1));
        StubRoster(managerUserId: 1);
        UpdateStageOwnerRequest? captured = null;
        _factory.MockStageOwnerUpdater
            .UpdateAsync(Arg.Do<UpdateStageOwnerRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new UpdateStageOwnerDto
            {
                Id = 1,
                Title = "X",
                Description = string.Empty,
                State = FeatureState.Development,
                PlannedStart = string.Empty,
                PlannedEnd = string.Empty,
                LeadUserId = 1,
                ManagerUserId = 1,
                CreatedAt = DateTime.UtcNow.ToString("O"),
                UpdatedAt = DateTime.UtcNow.ToString("O"),
                Version = 2,
                StagePlans =
                {
                    ProtoPlan(FeatureState.CsApproving),
                    ProtoPlan(FeatureState.Development),
                    ProtoPlan(FeatureState.Testing),
                    ProtoPlan(FeatureState.EthalonTesting),
                    ProtoPlan(FeatureState.LiveRelease),
                }
            }));

        var response = await client.PatchAsync("/api/plan/features/1/stages/Development/owner",
            JsonBody(new { stageOwnerUserId = (int?)null }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured!.StageOwnerUserId.Should().Be(0);
    }

    [Fact]
    public async Task UpdateStageOwner_UpstreamAlreadyExists_Returns409WithConflictBody()
    {
        // Extended error envelope (api-contract.md § "Error Envelope"): when
        // the Features service reports a version conflict, the gateway surfaces
        // 409 with both `error` and the structured `conflict.currentVersion`
        // so the FE can decide between replay and hard-reload.
        var client = ClientWithToken(ManagerToken(userId: 1));
        StubRoster(1, 42);
        _factory.MockStageOwnerUpdater
            .UpdateAsync(Arg.Any<UpdateStageOwnerRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(_ => throw new RpcException(new Status(
                StatusCode.AlreadyExists,
                "Updated by someone else|conflict={\"kind\":\"version\",\"currentVersion\":5}")));

        var response = await client.PatchAsync("/api/plan/features/1/stages/Development/owner",
            JsonBody(new { stageOwnerUserId = 42 }));

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        doc.RootElement.GetProperty("error").GetString().Should().Be("Updated by someone else");
        var conflict = doc.RootElement.GetProperty("conflict");
        conflict.GetProperty("kind").GetString().Should().Be("version");
        conflict.GetProperty("currentVersion").GetInt32().Should().Be(5);
    }

    // -------- Stage Planned Start --------

    [Fact]
    public async Task UpdateStagePlannedStart_HappyPath_ForwardsDate()
    {
        var client = ClientWithToken(ManagerToken());
        UpdateStagePlannedStartRequest? captured = null;
        _factory.MockStagePlannedStartUpdater
            .UpdateAsync(Arg.Do<UpdateStagePlannedStartRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new UpdateStagePlannedStartDto
            {
                Id = 1,
                Title = "X",
                Description = string.Empty,
                State = FeatureState.Development,
                PlannedStart = "2026-05-10",
                PlannedEnd = string.Empty,
                LeadUserId = 1,
                ManagerUserId = 1,
                CreatedAt = DateTime.UtcNow.ToString("O"),
                UpdatedAt = DateTime.UtcNow.ToString("O"),
                Version = 2,
                StagePlans =
                {
                    ProtoPlan(FeatureState.CsApproving),
                    new FeatureStagePlan { Stage = FeatureState.Development, PlannedStart = "2026-05-10", PlannedEnd = "", PerformerUserId = 0, Version = 1 },
                    ProtoPlan(FeatureState.Testing),
                    ProtoPlan(FeatureState.EthalonTesting),
                    ProtoPlan(FeatureState.LiveRelease),
                }
            }));

        var response = await client.PatchAsync("/api/plan/features/1/stages/Development/planned-start",
            JsonBody(new { plannedStart = "2026-05-10" }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured!.PlannedStart.Should().Be("2026-05-10");
    }

    [Fact]
    public async Task UpdateStagePlannedStart_UpstreamInvalidArgument_Returns400()
    {
        var client = ClientWithToken(ManagerToken());
        _factory.MockStagePlannedStartUpdater
            .UpdateAsync(Arg.Any<UpdateStagePlannedStartRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(_ => throw new RpcException(new Status(StatusCode.InvalidArgument, "bad date")));

        var response = await client.PatchAsync("/api/plan/features/1/stages/Development/planned-start",
            JsonBody(new { plannedStart = "nope" }));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdateStagePlannedStart_UnknownStage_Returns400()
    {
        var client = ClientWithToken(ManagerToken());

        var response = await client.PatchAsync("/api/plan/features/1/stages/Bogus/planned-start",
            JsonBody(new { plannedStart = "2026-05-10" }));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // -------- Stage Planned End --------

    [Fact]
    public async Task UpdateStagePlannedEnd_HappyPath_ForwardsDate()
    {
        var client = ClientWithToken(ManagerToken());
        UpdateStagePlannedEndRequest? captured = null;
        _factory.MockStagePlannedEndUpdater
            .UpdateAsync(Arg.Do<UpdateStagePlannedEndRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new UpdateStagePlannedEndDto
            {
                Id = 1,
                Title = "X",
                Description = string.Empty,
                State = FeatureState.Development,
                PlannedStart = string.Empty,
                PlannedEnd = "2026-06-30",
                LeadUserId = 1,
                ManagerUserId = 1,
                CreatedAt = DateTime.UtcNow.ToString("O"),
                UpdatedAt = DateTime.UtcNow.ToString("O"),
                Version = 2,
                StagePlans =
                {
                    ProtoPlan(FeatureState.CsApproving),
                    new FeatureStagePlan { Stage = FeatureState.Development, PlannedStart = "", PlannedEnd = "2026-06-30", PerformerUserId = 0, Version = 1 },
                    ProtoPlan(FeatureState.Testing),
                    ProtoPlan(FeatureState.EthalonTesting),
                    ProtoPlan(FeatureState.LiveRelease),
                }
            }));

        var response = await client.PatchAsync("/api/plan/features/1/stages/Development/planned-end",
            JsonBody(new { plannedEnd = "2026-06-30" }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured!.PlannedEnd.Should().Be("2026-06-30");
    }

    [Fact]
    public async Task UpdateStagePlannedEnd_NonManagerRole_Returns403()
    {
        var client = ClientWithToken(DevToken());

        var response = await client.PatchAsync("/api/plan/features/1/stages/Development/planned-end",
            JsonBody(new { plannedEnd = "2026-06-30" }));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // Regression: BE-002-03 — case-insensitive stage path segment.
    // Previously `stages/development/owner` returned 400 because TryParseStage
    // was a case-sensitive switch over PascalCase names. backend-eval-contract
    // §3 requires the lowercase form to canonicalise to the same FeatureState.
    [Fact]
    public async Task UpdateStageOwner_LowercaseStageInPath_CanonicalisesAndForwardsAsDevelopment()
    {
        var client = ClientWithToken(ManagerToken(userId: 1));
        StubRoster(1, 42);
        UpdateStageOwnerRequest? captured = null;
        _factory.MockStageOwnerUpdater
            .UpdateAsync(Arg.Do<UpdateStageOwnerRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new UpdateStageOwnerDto
            {
                Id = 1,
                Title = "X",
                Description = string.Empty,
                State = FeatureState.Development,
                PlannedStart = string.Empty,
                PlannedEnd = string.Empty,
                LeadUserId = 1,
                ManagerUserId = 1,
                CreatedAt = DateTime.UtcNow.ToString("O"),
                UpdatedAt = DateTime.UtcNow.ToString("O"),
                Version = 2,
                StagePlans =
                {
                    ProtoPlan(FeatureState.CsApproving),
                    new FeatureStagePlan { Stage = FeatureState.Development, PlannedStart = "", PlannedEnd = "", PerformerUserId = 42, Version = 1 },
                    ProtoPlan(FeatureState.Testing),
                    ProtoPlan(FeatureState.EthalonTesting),
                    ProtoPlan(FeatureState.LiveRelease),
                }
            }));

        var response = await client.PatchAsync("/api/plan/features/1/stages/development/owner",
            JsonBody(new { stageOwnerUserId = 42 }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured!.Stage.Should().Be(FeatureState.Development);
    }

    [Fact]
    public async Task UpdateStagePlannedStart_UppercaseStageInPath_CanonicalisesAndForwardsAsTesting()
    {
        var client = ClientWithToken(ManagerToken(userId: 1));
        UpdateStagePlannedStartRequest? captured = null;
        _factory.MockStagePlannedStartUpdater
            .UpdateAsync(Arg.Do<UpdateStagePlannedStartRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new UpdateStagePlannedStartDto
            {
                Id = 1,
                Title = "X",
                Description = string.Empty,
                State = FeatureState.Testing,
                PlannedStart = "2026-06-01",
                PlannedEnd = string.Empty,
                LeadUserId = 1,
                ManagerUserId = 1,
                CreatedAt = DateTime.UtcNow.ToString("O"),
                UpdatedAt = DateTime.UtcNow.ToString("O"),
                Version = 2,
                StagePlans =
                {
                    ProtoPlan(FeatureState.CsApproving),
                    ProtoPlan(FeatureState.Development),
                    new FeatureStagePlan { Stage = FeatureState.Testing, PlannedStart = "2026-06-01", PlannedEnd = "", PerformerUserId = 0, Version = 1 },
                    ProtoPlan(FeatureState.EthalonTesting),
                    ProtoPlan(FeatureState.LiveRelease),
                }
            }));

        var response = await client.PatchAsync("/api/plan/features/1/stages/TESTING/planned-start",
            JsonBody(new { plannedStart = "2026-06-01" }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured!.Stage.Should().Be(FeatureState.Testing);
    }
}
