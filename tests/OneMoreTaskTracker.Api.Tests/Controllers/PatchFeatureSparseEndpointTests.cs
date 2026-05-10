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

    private static PatchFeatureDto FlatDto(
        int id = 1,
        int managerUserId = 1,
        int leadUserId = 1,
        string csStart = "2025-01-01", string csEnd = "2025-01-15",
        string devStart = "2025-01-15", string devEnd = "2025-02-15",
        string testStart = "2025-02-15", string testEnd = "2025-03-01",
        string etStart = "2025-03-01", string etEnd = "2025-03-15",
        string lrStart = "2025-03-15", string lrEnd = "2025-04-01",
        int csOwner = 10, int devOwner = 11, int testOwner = 12,
        int etOwner = 13, int lrOwner = 14) =>
        new()
        {
            Id = id,
            Title = "F",
            Description = string.Empty,
            State = FeatureState.Development,
            PlannedStart = csStart,
            PlannedEnd = lrEnd,
            LeadUserId = leadUserId,
            ManagerUserId = managerUserId,
            CreatedAt = DateTime.UtcNow.ToString("O"),
            UpdatedAt = DateTime.UtcNow.ToString("O"),
            Version = 4,
            CsApprovingPlannedStart = csStart,
            CsApprovingPlannedEnd = csEnd,
            CsApprovingOwnerUserId = csOwner,
            DevelopmentPlannedStart = devStart,
            DevelopmentPlannedEnd = devEnd,
            DevelopmentOwnerUserId = devOwner,
            TestingPlannedStart = testStart,
            TestingPlannedEnd = testEnd,
            TestingOwnerUserId = testOwner,
            EthalonTestingPlannedStart = etStart,
            EthalonTestingPlannedEnd = etEnd,
            EthalonTestingOwnerUserId = etOwner,
            LiveReleasePlannedStart = lrStart,
            LiveReleasePlannedEnd = lrEnd,
            LiveReleaseOwnerUserId = lrOwner,
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
                csApprovingPlannedStart = "2025-01-01",
                csApprovingPlannedEnd = "2025-01-15",
                csApprovingOwnerUserId = 9,
                developmentPlannedStart = "2025-01-15",
                developmentPlannedEnd = "2025-02-15",
                developmentOwnerUserId = 9,
                testingPlannedStart = "2025-02-15",
                testingPlannedEnd = "2025-03-01",
                testingOwnerUserId = 9,
                ethalonTestingPlannedStart = "2025-03-01",
                ethalonTestingPlannedEnd = "2025-03-15",
                ethalonTestingOwnerUserId = 9,
                liveReleasePlannedStart = "2025-03-15",
                liveReleasePlannedEnd = "2025-04-01",
                liveReleaseOwnerUserId = 9,
            }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured!.HasTitle.Should().BeTrue();
        captured.Title.Should().Be("T");
        captured.HasDescription.Should().BeTrue();
        captured.Description.Should().Be("D");
        captured.HasLeadUserId.Should().BeTrue();
        captured.LeadUserId.Should().Be(9);

        captured.HasCsApprovingPlannedStart.Should().BeTrue();
        captured.CsApprovingPlannedStart.Should().Be("2025-01-01");
        captured.HasCsApprovingPlannedEnd.Should().BeTrue();
        captured.CsApprovingPlannedEnd.Should().Be("2025-01-15");
        captured.HasCsApprovingOwnerUserId.Should().BeTrue();
        captured.CsApprovingOwnerUserId.Should().Be(9);

        captured.HasDevelopmentPlannedStart.Should().BeTrue();
        captured.DevelopmentPlannedStart.Should().Be("2025-01-15");
        captured.HasDevelopmentPlannedEnd.Should().BeTrue();
        captured.DevelopmentPlannedEnd.Should().Be("2025-02-15");
        captured.HasDevelopmentOwnerUserId.Should().BeTrue();
        captured.DevelopmentOwnerUserId.Should().Be(9);

        captured.HasTestingPlannedStart.Should().BeTrue();
        captured.TestingPlannedStart.Should().Be("2025-02-15");
        captured.HasTestingPlannedEnd.Should().BeTrue();
        captured.TestingPlannedEnd.Should().Be("2025-03-01");
        captured.HasTestingOwnerUserId.Should().BeTrue();
        captured.TestingOwnerUserId.Should().Be(9);

        captured.HasEthalonTestingPlannedStart.Should().BeTrue();
        captured.EthalonTestingPlannedStart.Should().Be("2025-03-01");
        captured.HasEthalonTestingPlannedEnd.Should().BeTrue();
        captured.EthalonTestingPlannedEnd.Should().Be("2025-03-15");
        captured.HasEthalonTestingOwnerUserId.Should().BeTrue();
        captured.EthalonTestingOwnerUserId.Should().Be(9);

        captured.HasLiveReleasePlannedStart.Should().BeTrue();
        captured.LiveReleasePlannedStart.Should().Be("2025-03-15");
        captured.HasLiveReleasePlannedEnd.Should().BeTrue();
        captured.LiveReleasePlannedEnd.Should().Be("2025-04-01");
        captured.HasLiveReleaseOwnerUserId.Should().BeTrue();
        captured.LiveReleaseOwnerUserId.Should().Be(9);
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

    [Theory]
    [InlineData("csApprovingPlannedStart", "2025-01-01", "HasCsApprovingPlannedStart", "CsApprovingPlannedStart")]
    [InlineData("csApprovingPlannedEnd",   "2025-01-15", "HasCsApprovingPlannedEnd",   "CsApprovingPlannedEnd")]
    [InlineData("developmentPlannedStart", "2025-01-15", "HasDevelopmentPlannedStart", "DevelopmentPlannedStart")]
    [InlineData("developmentPlannedEnd",   "2025-02-15", "HasDevelopmentPlannedEnd",   "DevelopmentPlannedEnd")]
    [InlineData("testingPlannedStart",     "2025-02-15", "HasTestingPlannedStart",     "TestingPlannedStart")]
    [InlineData("testingPlannedEnd",       "2025-03-01", "HasTestingPlannedEnd",       "TestingPlannedEnd")]
    [InlineData("ethalonTestingPlannedStart", "2025-03-01", "HasEthalonTestingPlannedStart", "EthalonTestingPlannedStart")]
    [InlineData("ethalonTestingPlannedEnd",   "2025-03-15", "HasEthalonTestingPlannedEnd",   "EthalonTestingPlannedEnd")]
    [InlineData("liveReleasePlannedStart", "2025-03-15", "HasLiveReleasePlannedStart", "LiveReleasePlannedStart")]
    [InlineData("liveReleasePlannedEnd",   "2025-04-01", "HasLiveReleasePlannedEnd",   "LiveReleasePlannedEnd")]
    public async Task Patch_SingleStageDateField_ForwardsHasFlag(
        string jsonKey, string dateValue, string hasPropertyName, string valuePropertyName)
    {
        var client = ClientWithToken(ManagerToken(userId: 1));
        PatchFeatureRequest? captured = null;
        _factory.MockFeaturePatcher
            .PatchAsync(Arg.Do<PatchFeatureRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(FiveRowDto()));

        var body = new Dictionary<string, object> { [jsonKey] = dateValue };
        var response = await client.PatchAsync("/api/plan/features/1", JsonBody(body));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured.Should().NotBeNull();

        var hasFlag = (bool?)typeof(PatchFeatureRequest).GetProperty(hasPropertyName)?.GetValue(captured);
        hasFlag.Should().BeTrue(because: $"{hasPropertyName} must be true when {jsonKey} is provided");

        var value = (string?)typeof(PatchFeatureRequest).GetProperty(valuePropertyName)?.GetValue(captured);
        value.Should().Be(dateValue, because: $"{valuePropertyName} must equal the submitted date");
    }

    [Theory]
    [InlineData("csApprovingOwnerUserId",    20, "HasCsApprovingOwnerUserId",    "CsApprovingOwnerUserId")]
    [InlineData("developmentOwnerUserId",    21, "HasDevelopmentOwnerUserId",    "DevelopmentOwnerUserId")]
    [InlineData("testingOwnerUserId",        22, "HasTestingOwnerUserId",        "TestingOwnerUserId")]
    [InlineData("ethalonTestingOwnerUserId", 23, "HasEthalonTestingOwnerUserId", "EthalonTestingOwnerUserId")]
    [InlineData("liveReleaseOwnerUserId",    24, "HasLiveReleaseOwnerUserId",    "LiveReleaseOwnerUserId")]
    public async Task Patch_SingleStageOwnerField_ForwardsHasFlag(
        string jsonKey, int ownerUserId, string hasPropertyName, string valuePropertyName)
    {
        var client = ClientWithToken(ManagerToken(userId: 1));
        PatchFeatureRequest? captured = null;
        _factory.MockFeaturePatcher
            .PatchAsync(Arg.Do<PatchFeatureRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(FiveRowDto()));

        var body = new Dictionary<string, object> { [jsonKey] = ownerUserId };
        var response = await client.PatchAsync("/api/plan/features/1", JsonBody(body));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured.Should().NotBeNull();

        var hasFlag = (bool?)typeof(PatchFeatureRequest).GetProperty(hasPropertyName)?.GetValue(captured);
        hasFlag.Should().BeTrue(because: $"{hasPropertyName} must be true when {jsonKey} is provided");

        var value = (int?)typeof(PatchFeatureRequest).GetProperty(valuePropertyName)?.GetValue(captured);
        value.Should().Be(ownerUserId, because: $"{valuePropertyName} must equal the submitted owner id");
    }

    [Fact]
    public async Task Patch_FlatStageFields_AppearsInResponseBody()
    {
        var client = ClientWithToken(ManagerToken(userId: 1));
        _factory.MockFeaturePatcher
            .PatchAsync(Arg.Any<PatchFeatureRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(FlatDto(managerUserId: 1)));

        var response = await client.PatchAsync("/api/plan/features/1",
            JsonBody(new { title = "Updated" }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        root.GetProperty("csApprovingPlannedStart").GetString().Should().Be("2025-01-01");
        root.GetProperty("csApprovingPlannedEnd").GetString().Should().Be("2025-01-15");
        root.GetProperty("csApprovingOwnerUserId").GetInt32().Should().Be(10);
        root.GetProperty("developmentPlannedStart").GetString().Should().Be("2025-01-15");
        root.GetProperty("developmentPlannedEnd").GetString().Should().Be("2025-02-15");
        root.GetProperty("developmentOwnerUserId").GetInt32().Should().Be(11);
        root.GetProperty("testingPlannedStart").GetString().Should().Be("2025-02-15");
        root.GetProperty("testingPlannedEnd").GetString().Should().Be("2025-03-01");
        root.GetProperty("testingOwnerUserId").GetInt32().Should().Be(12);
        root.GetProperty("ethalonTestingPlannedStart").GetString().Should().Be("2025-03-01");
        root.GetProperty("ethalonTestingPlannedEnd").GetString().Should().Be("2025-03-15");
        root.GetProperty("ethalonTestingOwnerUserId").GetInt32().Should().Be(13);
        root.GetProperty("liveReleasePlannedStart").GetString().Should().Be("2025-03-15");
        root.GetProperty("liveReleasePlannedEnd").GetString().Should().Be("2025-04-01");
        root.GetProperty("liveReleaseOwnerUserId").GetInt32().Should().Be(14);
    }

    [Fact]
    public async Task Patch_UpstreamFailedPrecondition_Returns422WithOverlapShape()
    {
        var client = ClientWithToken(ManagerToken());
        _factory.MockFeaturePatcher
            .PatchAsync(Arg.Any<PatchFeatureRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(_ => throw new RpcException(new Status(
                StatusCode.FailedPrecondition,
                "Stage order violation|conflict={\"kind\":\"overlap\",\"neighbour\":\"Development\"}")));

        var response = await client.PatchAsync("/api/plan/features/1",
            JsonBody(new
            {
                csApprovingPlannedStart = "2025-01-01",
                csApprovingPlannedEnd = "2025-01-20",
                developmentPlannedStart = "2025-01-10",
            }));

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("overlap");
        body.Should().Contain("Development");
    }

    [Fact]
    public async Task Patch_OmittedStageDateFields_HasFlagIsFalse()
    {
        var client = ClientWithToken(ManagerToken(userId: 1));
        PatchFeatureRequest? captured = null;
        _factory.MockFeaturePatcher
            .PatchAsync(Arg.Do<PatchFeatureRequest>(r => captured = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(FiveRowDto()));

        var response = await client.PatchAsync("/api/plan/features/1",
            JsonBody(new { title = "T" }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured!.HasCsApprovingPlannedStart.Should().BeFalse();
        captured.HasCsApprovingPlannedEnd.Should().BeFalse();
        captured.HasDevelopmentPlannedStart.Should().BeFalse();
        captured.HasDevelopmentPlannedEnd.Should().BeFalse();
        captured.HasTestingPlannedStart.Should().BeFalse();
        captured.HasTestingPlannedEnd.Should().BeFalse();
        captured.HasEthalonTestingPlannedStart.Should().BeFalse();
        captured.HasEthalonTestingPlannedEnd.Should().BeFalse();
        captured.HasLiveReleasePlannedStart.Should().BeFalse();
        captured.HasLiveReleasePlannedEnd.Should().BeFalse();
        captured.HasCsApprovingOwnerUserId.Should().BeFalse();
        captured.HasDevelopmentOwnerUserId.Should().BeFalse();
        captured.HasTestingOwnerUserId.Should().BeFalse();
        captured.HasEthalonTestingOwnerUserId.Should().BeFalse();
        captured.HasLiveReleaseOwnerUserId.Should().BeFalse();
    }
}
