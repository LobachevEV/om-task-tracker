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
using OneMoreTaskTracker.Proto.Features.ListFeaturesQuery;
using OneMoreTaskTracker.Proto.Features.PatchFeatureCommand;
using OneMoreTaskTracker.Proto.Tasks.ListTasksQuery;
using OneMoreTaskTracker.Proto.Users;
using Xunit;
using GetFeatureDto = OneMoreTaskTracker.Proto.Features.GetFeatureQuery.FeatureDto;
using ListFeatureDto = OneMoreTaskTracker.Proto.Features.ListFeaturesQuery.FeatureDto;
using PatchFeatureDto = OneMoreTaskTracker.Proto.Features.PatchFeatureCommand.FeatureDto;

namespace OneMoreTaskTracker.Api.Tests.Controllers;

public sealed class PlanControllerStagePlansTests(TasksControllerWebApplicationFactory factory)
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

    private void StubEmptyTasks() =>
        _factory.MockTaskLister
            .ListTasksAsync(Arg.Any<ListTasksRequest>(), Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new ListTasksResponse()));

    private static FeatureStagePlan ProtoPlan(
        FeatureState stage,
        string? start = null,
        string? end = null,
        int performer = 0) =>
        new()
        {
            Stage           = stage,
            PlannedStart    = start ?? string.Empty,
            PlannedEnd      = end   ?? string.Empty,
            PerformerUserId = performer,
        };

    private static PatchFeatureDto FiveRowPatchDto(int id = 1, int managerUserId = 1, int leadUserId = 1) =>
        new()
        {
            Id = id,
            Title = "F",
            Description = string.Empty,
            State = FeatureState.Development,
            PlannedStart = "2026-05-01",
            PlannedEnd = "2026-06-15",
            LeadUserId = leadUserId,
            ManagerUserId = managerUserId,
            CreatedAt = DateTime.UtcNow.ToString("O"),
            UpdatedAt = DateTime.UtcNow.ToString("O"),
            StagePlans =
            {
                ProtoPlan(FeatureState.CsApproving,    "2026-05-01", "2026-05-10", 4),
                ProtoPlan(FeatureState.Development,    "2026-05-11", "2026-06-01", 2),
                ProtoPlan(FeatureState.Testing),
                ProtoPlan(FeatureState.EthalonTesting, "2026-06-05", "2026-06-10", 6),
                ProtoPlan(FeatureState.LiveRelease,    "2026-06-12", "2026-06-15", 1),
            }
        };

    [Fact]
    public async Task UpdateFeature_RoutesToSparsePatchHandler()
    {
        var client = ClientWithToken(ManagerToken());

        PatchFeatureRequest? captured = null;
        _factory.MockFeaturePatcher
            .PatchAsync(Arg.Do<PatchFeatureRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(FiveRowPatchDto()));

        var response = await client.PatchAsync("/api/plan/features/1",
            JsonBody(new { title = "Renamed" }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured.Should().NotBeNull();
        captured!.HasTitle.Should().BeTrue();
        captured.Title.Should().Be("Renamed");
        captured.HasDescription.Should().BeFalse();
        captured.HasLeadUserId.Should().BeFalse();
    }

    [Fact]
    public async Task GetFeature_ResolvesPerformerFromRoster()
    {
        var client = ClientWithToken(ManagerToken(userId: 1));
        StubEmptyTasks();

        _factory.MockFeatureGetter
            .GetAsync(Arg.Is<GetFeatureRequest>(r => r.Id == 42),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new GetFeatureDto
            {
                Id = 42,
                Title = "F",
                Description = string.Empty,
                State = FeatureState.Development,
                PlannedStart = string.Empty,
                PlannedEnd = string.Empty,
                LeadUserId = 1,
                ManagerUserId = 1,
                CreatedAt = DateTime.UtcNow.ToString("O"),
                UpdatedAt = DateTime.UtcNow.ToString("O"),
                StagePlans =
                {
                    ProtoPlan(FeatureState.CsApproving, performer: 2),
                    ProtoPlan(FeatureState.Development),
                    ProtoPlan(FeatureState.Testing),
                    ProtoPlan(FeatureState.EthalonTesting),
                    ProtoPlan(FeatureState.LiveRelease),
                }
            }));

        _factory.MockUserService
            .GetTeamMemberIdsAsync(Arg.Any<GetTeamMemberIdsRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new GetTeamMemberIdsResponse()));

        _factory.MockUserService
            .GetTeamRosterAsync(Arg.Any<GetTeamRosterRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new GetTeamRosterResponse
            {
                Members =
                {
                    new TeamRosterMember { UserId = 2, Email = "alice@example.com", Role = Roles.FrontendDeveloper },
                }
            }));

        var response = await client.GetAsync("/api/plan/features/42");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("\"stagePlans\":");
        body.Should().Contain("alice@example.com");
    }

    [Fact]
    public async Task GetFeature_WhenStagePerformerIdIsStale_PerformerIsNull()
    {
        var client = ClientWithToken(ManagerToken(userId: 1));
        StubEmptyTasks();

        _factory.MockFeatureGetter
            .GetAsync(Arg.Any<GetFeatureRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new GetFeatureDto
            {
                Id = 42,
                Title = "F",
                Description = string.Empty,
                State = FeatureState.Development,
                PlannedStart = string.Empty,
                PlannedEnd = string.Empty,
                LeadUserId = 1,
                ManagerUserId = 1,
                CreatedAt = DateTime.UtcNow.ToString("O"),
                UpdatedAt = DateTime.UtcNow.ToString("O"),
                StagePlans =
                {
                    ProtoPlan(FeatureState.CsApproving, performer: 999),
                    ProtoPlan(FeatureState.Development),
                    ProtoPlan(FeatureState.Testing),
                    ProtoPlan(FeatureState.EthalonTesting),
                    ProtoPlan(FeatureState.LiveRelease),
                }
            }));

        _factory.MockUserService
            .GetTeamMemberIdsAsync(Arg.Any<GetTeamMemberIdsRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new GetTeamMemberIdsResponse()));

        _factory.MockUserService
            .GetTeamRosterAsync(Arg.Any<GetTeamRosterRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new GetTeamRosterResponse()));

        var response = await client.GetAsync("/api/plan/features/42");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var bodyText = await response.Content.ReadAsStringAsync();
        bodyText.Should().Contain("\"performerUserId\":999");

        using var doc = JsonDocument.Parse(bodyText);
        var stagePlans = doc.RootElement.GetProperty("stagePlans");
        stagePlans.GetArrayLength().Should().Be(5);

        var staleStage = stagePlans.EnumerateArray()
            .Single(sp =>
            {
                var pid = sp.GetProperty("performerUserId");
                return pid.ValueKind == JsonValueKind.Number && pid.GetInt32() == 999;
            });
        staleStage.GetProperty("performer").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task UpdateFeature_WhenCallerDoesNotOwnFeature_Returns403()
    {
        var client = ClientWithToken(ManagerToken(userId: 42));

        PatchFeatureRequest? captured = null;
        _factory.MockFeaturePatcher
            .PatchAsync(Arg.Do<PatchFeatureRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(_ => throw new RpcException(new Status(StatusCode.PermissionDenied, "Not the feature owner")));

        var response = await client.PatchAsync("/api/plan/features/1",
            JsonBody(new { title = "Pwned" }));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        captured.Should().NotBeNull();
        captured!.CallerUserId.Should().Be(42);
    }

    [Fact]
    public async Task UpdateFeature_ForwardsCallerUserIdFromJwt()
    {
        const int callerId = 77;
        var client = ClientWithToken(ManagerToken(userId: callerId));

        PatchFeatureRequest? captured = null;
        _factory.MockFeaturePatcher
            .PatchAsync(Arg.Do<PatchFeatureRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(FiveRowPatchDto(managerUserId: callerId, leadUserId: callerId)));

        var response = await client.PatchAsync("/api/plan/features/1",
            JsonBody(new { title = "Renamed" }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured.Should().NotBeNull();
        captured!.CallerUserId.Should().Be(callerId);
    }

    [Fact]
    public async Task ListFeatures_IncludesStagePlansInEachSummary()
    {
        var client = ClientWithToken(ManagerToken(userId: 1));
        StubEmptyTasks();

        _factory.MockUserService
            .GetTeamMemberIdsAsync(Arg.Any<GetTeamMemberIdsRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new GetTeamMemberIdsResponse()));

        _factory.MockFeaturesLister
            .ListAsync(Arg.Any<ListFeaturesRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new ListFeaturesResponse
            {
                Features =
                {
                    new ListFeatureDto
                    {
                        Id = 1,
                        Title = "F1",
                        Description = "desc",
                        State = FeatureState.Development,
                        PlannedStart = "2026-01-01",
                        PlannedEnd = string.Empty,
                        LeadUserId = 1,
                        ManagerUserId = 1,
                        StagePlans =
                        {
                            ProtoPlan(FeatureState.CsApproving),
                            ProtoPlan(FeatureState.Development),
                            ProtoPlan(FeatureState.Testing),
                            ProtoPlan(FeatureState.EthalonTesting),
                            ProtoPlan(FeatureState.LiveRelease),
                        }
                    }
                }
            }));

        var response = await client.GetAsync("/api/plan/features");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("\"stagePlans\":");
    }
}
