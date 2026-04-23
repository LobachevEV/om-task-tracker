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
using OneMoreTaskTracker.Proto.Features.UpdateFeatureCommand;
using OneMoreTaskTracker.Proto.Tasks.ListTasksQuery;
using OneMoreTaskTracker.Proto.Users;
using Xunit;
using GetFeatureDto = OneMoreTaskTracker.Proto.Features.GetFeatureQuery.FeatureDto;
using UpdateFeatureDto = OneMoreTaskTracker.Proto.Features.UpdateFeatureCommand.FeatureDto;
using ListFeatureDto = OneMoreTaskTracker.Proto.Features.ListFeaturesQuery.FeatureDto;

namespace OneMoreTaskTracker.Api.Tests.Controllers;

// Controller-level tests for the stage-planning surface. Covers:
//   - PATCH /api/plan/features/{id} validation (count, duplicates, unknown stage)
//   - PATCH happy path (proto request shape) and response shape (5 rows, id-only performer)
//   - GET detail performer resolution (resolved mini-member per stage; stale id produces placeholder)
//   - GET list response carries 5-row stage plans
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

    private static UpdateFeatureDto FiveRowUpdateDto(int id = 1, int managerUserId = 1, int leadUserId = 1) =>
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
    public async Task UpdateFeature_StagePlansNull_DoesNotSendAnyStagePlansOnWire()
    {
        var client = ClientWithToken(ManagerToken());

        UpdateFeatureRequest? captured = null;
        _factory.MockFeatureUpdater
            .UpdateAsync(Arg.Do<UpdateFeatureRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(FiveRowUpdateDto()));

        var response = await client.PatchAsync("/api/plan/features/1",
            JsonBody(new { title = "Renamed" }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured.Should().NotBeNull();
        captured!.StagePlans.Should().BeEmpty("omitted stagePlans means do-not-touch");
    }

    [Fact]
    public async Task UpdateFeature_StagePlansWithWrongCount_Returns400()
    {
        var client = ClientWithToken(ManagerToken());
        StubEmptyTasks();

        var body = new
        {
            stagePlans = new[]
            {
                new { stage = "CsApproving", plannedStart = (string?)null, plannedEnd = (string?)null, performerUserId = (int?)null },
                new { stage = "Development", plannedStart = (string?)null, plannedEnd = (string?)null, performerUserId = (int?)null },
            }
        };

        var response = await client.PatchAsync("/api/plan/features/1", JsonBody(body));
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdateFeature_StagePlansWithDuplicateStages_Returns400()
    {
        var client = ClientWithToken(ManagerToken());

        var body = new
        {
            stagePlans = new[]
            {
                new { stage = "CsApproving",    plannedStart = (string?)null, plannedEnd = (string?)null, performerUserId = (int?)null },
                new { stage = "Development",    plannedStart = (string?)null, plannedEnd = (string?)null, performerUserId = (int?)null },
                new { stage = "Development",    plannedStart = (string?)null, plannedEnd = (string?)null, performerUserId = (int?)null },
                new { stage = "EthalonTesting", plannedStart = (string?)null, plannedEnd = (string?)null, performerUserId = (int?)null },
                new { stage = "LiveRelease",    plannedStart = (string?)null, plannedEnd = (string?)null, performerUserId = (int?)null },
            }
        };

        var response = await client.PatchAsync("/api/plan/features/1", JsonBody(body));
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdateFeature_StagePlansWithUnknownStage_Returns400()
    {
        var client = ClientWithToken(ManagerToken());

        var body = new
        {
            stagePlans = new[]
            {
                new { stage = "CsApproving",    plannedStart = (string?)null, plannedEnd = (string?)null, performerUserId = (int?)null },
                new { stage = "Development",    plannedStart = (string?)null, plannedEnd = (string?)null, performerUserId = (int?)null },
                new { stage = "Nonsense",       plannedStart = (string?)null, plannedEnd = (string?)null, performerUserId = (int?)null },
                new { stage = "EthalonTesting", plannedStart = (string?)null, plannedEnd = (string?)null, performerUserId = (int?)null },
                new { stage = "LiveRelease",    plannedStart = (string?)null, plannedEnd = (string?)null, performerUserId = (int?)null },
            }
        };

        var response = await client.PatchAsync("/api/plan/features/1", JsonBody(body));
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdateFeature_WithFiveStagePlans_ForwardsProtoRequestAndEchoesResponse()
    {
        var client = ClientWithToken(ManagerToken());

        UpdateFeatureRequest? captured = null;
        _factory.MockFeatureUpdater
            .UpdateAsync(Arg.Do<UpdateFeatureRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(FiveRowUpdateDto()));

        // Cast every plannedStart/End to `string?` so the anonymous-type array
        // infers string? uniformly — mixing `string` literals with
        // `(string?)null` items otherwise trips CS8619 under
        // `<Nullable>enable</Nullable>`.
        var body = new
        {
            stagePlans = new[]
            {
                new { stage = "CsApproving",    plannedStart = (string?)"2026-05-01", plannedEnd = (string?)"2026-05-10", performerUserId = (int?)4 },
                new { stage = "Development",    plannedStart = (string?)"2026-05-11", plannedEnd = (string?)"2026-06-01", performerUserId = (int?)2 },
                new { stage = "Testing",        plannedStart = (string?)null,         plannedEnd = (string?)null,         performerUserId = (int?)null },
                new { stage = "EthalonTesting", plannedStart = (string?)"2026-06-05", plannedEnd = (string?)"2026-06-10", performerUserId = (int?)6 },
                new { stage = "LiveRelease",    plannedStart = (string?)"2026-06-12", plannedEnd = (string?)"2026-06-15", performerUserId = (int?)1 },
            }
        };

        var response = await client.PatchAsync("/api/plan/features/1", JsonBody(body));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured.Should().NotBeNull();
        captured!.StagePlans.Should().HaveCount(5);
        captured.StagePlans.Select(sp => sp.Stage).Should().Contain(new[]
        {
            FeatureState.CsApproving, FeatureState.Development, FeatureState.Testing,
            FeatureState.EthalonTesting, FeatureState.LiveRelease,
        });

        var json = await response.Content.ReadAsStringAsync();
        json.Should().Contain("\"stagePlans\":");
        json.Should().Contain("\"CsApproving\"");
    }

    [Fact]
    public async Task UpdateFeature_NegativePerformerUserId_CoercesToZeroOnWire()
    {
        var client = ClientWithToken(ManagerToken());

        UpdateFeatureRequest? captured = null;
        _factory.MockFeatureUpdater
            .UpdateAsync(Arg.Do<UpdateFeatureRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(FiveRowUpdateDto()));

        var body = new
        {
            stagePlans = new[]
            {
                new { stage = "CsApproving",    plannedStart = (string?)null, plannedEnd = (string?)null, performerUserId = (int?)-7 },
                new { stage = "Development",    plannedStart = (string?)null, plannedEnd = (string?)null, performerUserId = (int?)null },
                new { stage = "Testing",        plannedStart = (string?)null, plannedEnd = (string?)null, performerUserId = (int?)null },
                new { stage = "EthalonTesting", plannedStart = (string?)null, plannedEnd = (string?)null, performerUserId = (int?)null },
                new { stage = "LiveRelease",    plannedStart = (string?)null, plannedEnd = (string?)null, performerUserId = (int?)null },
            }
        };

        var response = await client.PatchAsync("/api/plan/features/1", JsonBody(body));
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured.Should().NotBeNull();
        captured!.StagePlans.First(sp => sp.Stage == FeatureState.CsApproving).PerformerUserId.Should().Be(0);
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
        body.Should().Contain("alice@example.com", "resolved performer mini-member is included in the detail response");
    }

    [Fact]
    public async Task GetFeature_WhenStagePerformerIdIsStale_PerformerIsNull()
    {
        // Regression for BE-001-02 / CT-001-01: when a stage's stored
        // performerUserId is no longer on the roster, the detail response MUST
        // emit `performer: null` rather than a placeholder MiniTeamMember with
        // empty email/displayName/role. The FE's Zod schema requires
        // `email.email()` and `displayName.min(1)`; empty-string placeholders
        // fail runtime validation. The stale id itself stays on the wire via
        // `performerUserId` so the FE can render the "Performer no longer on
        // team" state.
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
                    ProtoPlan(FeatureState.CsApproving, performer: 999), // not on roster
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
        bodyText.Should().Contain("\"performerUserId\":999",
            "stale id is preserved on the wire so FE can render the 'Performer no longer on team' state");

        // Locate the stale stage's JSON object and assert `performer` is literally null.
        using var doc = JsonDocument.Parse(bodyText);
        var stagePlans = doc.RootElement.GetProperty("stagePlans");
        stagePlans.GetArrayLength().Should().Be(5);

        // performerUserId is `null` for the unassigned stages and `999` for the
        // stale one — filter on kind first so `GetInt32` never hits a Null.
        var staleStage = stagePlans.EnumerateArray()
            .Single(sp =>
            {
                var pid = sp.GetProperty("performerUserId");
                return pid.ValueKind == JsonValueKind.Number && pid.GetInt32() == 999;
            });
        staleStage.GetProperty("performer").ValueKind.Should().Be(JsonValueKind.Null,
            "stale performer ids emit `performer: null` (never an empty-string placeholder object) so the FE's Zod email/displayName constraints pass");
    }

    [Fact]
    public async Task UpdateFeature_WhenCallerDoesNotOwnFeature_Returns403()
    {
        // Regression for BE-001-01: a Manager who does NOT own the target
        // feature must be rejected. The Features service enforces this by
        // comparing `feature.ManagerUserId` against the propagated
        // `CallerUserId` and raising `RpcException(PermissionDenied)`; the
        // gateway middleware maps that to HTTP 403. We simulate the Features
        // service's response via the mock and assert the gateway surfaces 403.
        var client = ClientWithToken(ManagerToken(userId: 42));

        UpdateFeatureRequest? captured = null;
        _factory.MockFeatureUpdater
            .UpdateAsync(Arg.Do<UpdateFeatureRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(_ => throw new RpcException(new Status(StatusCode.PermissionDenied, "Not the feature owner")));

        var response = await client.PatchAsync("/api/plan/features/1",
            JsonBody(new { title = "Pwned" }));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        // And the gateway must have propagated the caller id so the Features
        // service could perform the check — no id propagated means the check
        // can't happen (and the request would fall through).
        captured.Should().NotBeNull();
        captured!.CallerUserId.Should().Be(42, "gateway must forward the authenticated caller id for the Features service to re-verify ownership");
    }

    [Fact]
    public async Task UpdateFeature_ForwardsCallerUserIdFromJwt()
    {
        // Defensive coverage: even on the happy path, the caller id MUST be
        // populated on the proto request so the Features service's ownership
        // check has something to compare against.
        const int callerId = 77;
        var client = ClientWithToken(ManagerToken(userId: callerId));

        UpdateFeatureRequest? captured = null;
        _factory.MockFeatureUpdater
            .UpdateAsync(Arg.Do<UpdateFeatureRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(FiveRowUpdateDto(managerUserId: callerId, leadUserId: callerId)));

        var response = await client.PatchAsync("/api/plan/features/1",
            JsonBody(new { title = "Renamed" }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured.Should().NotBeNull();
        captured!.CallerUserId.Should().Be(callerId);
    }

    [Fact]
    public async Task UpdateFeature_StagePlansEmptyArray_Returns400()
    {
        // Regression for BE-001-03: an explicit empty array for `stagePlans`
        // must be rejected with 400 per api-contract.md "Partial update
        // semantics". Empty-array-as-clear is forbidden; clients must send all
        // 5 rows with nulls to clarify intent.
        var client = ClientWithToken(ManagerToken());

        // Ensure the mock is not invoked — the gateway must reject before
        // talking to the Features service.
        _factory.MockFeatureUpdater
            .UpdateAsync(Arg.Any<UpdateFeatureRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(_ => throw new InvalidOperationException("Features service must not be called for an invalid empty-array body"));

        var body = new
        {
            stagePlans = Array.Empty<object>(),
        };

        var response = await client.PatchAsync("/api/plan/features/1", JsonBody(body));
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
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
