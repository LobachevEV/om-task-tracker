using FluentAssertions;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using OneMoreTaskTracker.Features.Features.Create;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Features.Features.Update;
using OneMoreTaskTracker.Features.Tests.TestHelpers;
using OneMoreTaskTracker.Proto.Features.CreateFeatureCommand;
using OneMoreTaskTracker.Proto.Features.PatchFeatureCommand;
using Xunit;

namespace OneMoreTaskTracker.Features.Tests.Features.Update;

public sealed class PatchFeatureHandlerTests
{
    public PatchFeatureHandlerTests() => FeatureMappingConfig.Register();

    private static FeaturesDbContext NewDb() => new(
        new DbContextOptionsBuilder<FeaturesDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static PatchFeatureHandler Handler(FeaturesDbContext db) =>
        new(db, NullLogger<PatchFeatureHandler>.Instance, TestRequestClock.System());

    private static async Task<OneMoreTaskTracker.Proto.Features.CreateFeatureCommand.FeatureDto> CreateFeatureAsync(
        FeaturesDbContext db,
        string title = "Original",
        int managerUserId = 1,
        int leadUserId = 7,
        string? description = "Initial description")
    {
        var request = new CreateFeatureRequest
        {
            Title = title,
            ManagerUserId = managerUserId,
            LeadUserId = leadUserId,
        };
        if (description is not null)
            request.Description = description;
        return await new CreateFeatureHandler(db, TestRequestClock.System()).Create(request, TestServerCallContext.Create());
    }

    [Fact]
    public async Task Patch_TitleOnly_BumpsVersionByOneAndStampsUpdatedAt()
    {
        var db = NewDb();
        var created = await CreateFeatureAsync(db);
        var versionBefore = created.Version;
        var updatedAtBefore = DateTime.Parse(created.UpdatedAt).ToUniversalTime();

        await Task.Delay(5);

        var dto = await Handler(db).Patch(
            new PatchFeatureRequest
            {
                Id = created.Id,
                CallerUserId = 1,
                Title = "Renamed",
            },
            TestServerCallContext.Create());

        dto.Title.Should().Be("Renamed");
        dto.Version.Should().Be(versionBefore + 1);
        dto.Description.Should().Be("Initial description");
        dto.LeadUserId.Should().Be(7);

        var stored = await db.Features.AsNoTracking().SingleAsync(f => f.Id == created.Id);
        stored.Title.Should().Be("Renamed");
        stored.Version.Should().Be(versionBefore + 1);
        stored.UpdatedAt.Should().BeAfter(updatedAtBefore);
    }

    [Fact]
    public async Task Patch_DescriptionOnly_BumpsVersionByOneAndLeavesOtherFields()
    {
        var db = NewDb();
        var created = await CreateFeatureAsync(db);

        var dto = await Handler(db).Patch(
            new PatchFeatureRequest
            {
                Id = created.Id,
                CallerUserId = 1,
                Description = "Updated description",
            },
            TestServerCallContext.Create());

        dto.Description.Should().Be("Updated description");
        dto.Title.Should().Be("Original");
        dto.LeadUserId.Should().Be(7);
        dto.Version.Should().Be(created.Version + 1);
    }

    [Fact]
    public async Task Patch_LeadOnly_BumpsVersionByOneAndLeavesOtherFields()
    {
        var db = NewDb();
        var created = await CreateFeatureAsync(db);

        var dto = await Handler(db).Patch(
            new PatchFeatureRequest
            {
                Id = created.Id,
                CallerUserId = 1,
                LeadUserId = 42,
            },
            TestServerCallContext.Create());

        dto.LeadUserId.Should().Be(42);
        dto.Title.Should().Be("Original");
        dto.Description.Should().Be("Initial description");
        dto.Version.Should().Be(created.Version + 1);
    }

    [Fact]
    public async Task Patch_AllThreeFieldsAtOnce_BumpsVersionByThreeWithSingleUpdatedAtSnapshot()
    {
        var db = NewDb();
        var created = await CreateFeatureAsync(db);

        var dto = await Handler(db).Patch(
            new PatchFeatureRequest
            {
                Id = created.Id,
                CallerUserId = 1,
                Title = "Renamed",
                Description = "New desc",
                LeadUserId = 9,
            },
            TestServerCallContext.Create());

        dto.Title.Should().Be("Renamed");
        dto.Description.Should().Be("New desc");
        dto.LeadUserId.Should().Be(9);
        dto.Version.Should().Be(created.Version + 3);

        var stored = await db.Features.AsNoTracking().SingleAsync(f => f.Id == created.Id);
        stored.Version.Should().Be(created.Version + 3);
    }

    [Fact]
    public async Task Patch_NoFields_ReturnsCurrentSnapshotWithoutBumpingVersion()
    {
        var db = NewDb();
        var created = await CreateFeatureAsync(db);

        var dto = await Handler(db).Patch(
            new PatchFeatureRequest
            {
                Id = created.Id,
                CallerUserId = 1,
            },
            TestServerCallContext.Create());

        dto.Version.Should().Be(created.Version);
        dto.Title.Should().Be("Original");
        dto.Description.Should().Be("Initial description");
        dto.LeadUserId.Should().Be(7);

        var stored = await db.Features.AsNoTracking().SingleAsync(f => f.Id == created.Id);
        stored.Version.Should().Be(created.Version);
    }

    [Fact]
    public async Task Patch_TrimsTitle()
    {
        var db = NewDb();
        var created = await CreateFeatureAsync(db);

        var dto = await Handler(db).Patch(
            new PatchFeatureRequest
            {
                Id = created.Id,
                CallerUserId = 1,
                Title = "  Trimmed  ",
            },
            TestServerCallContext.Create());

        dto.Title.Should().Be("Trimmed");
    }

    [Fact]
    public async Task Patch_EmptyTitle_ThrowsInvalidArgument()
    {
        var validator = new PatchFeatureRequestValidator();
        var request = new PatchFeatureRequest
        {
            Id = 1,
            CallerUserId = 1,
            Title = "   ",
        };

        var act = () => ValidationPipeline.ValidateAsync(validator, request);

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Patch_TooLongTitle_ThrowsInvalidArgument()
    {
        var validator = new PatchFeatureRequestValidator();
        var request = new PatchFeatureRequest
        {
            Id = 1,
            CallerUserId = 1,
            Title = new string('x', 201),
        };

        var act = () => ValidationPipeline.ValidateAsync(validator, request);

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Patch_TooLongDescription_ThrowsInvalidArgument()
    {
        var validator = new PatchFeatureRequestValidator();
        var request = new PatchFeatureRequest
        {
            Id = 1,
            CallerUserId = 1,
            Description = new string('d', 4001),
        };

        var act = () => ValidationPipeline.ValidateAsync(validator, request);

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Patch_BlankDescription_ClearsToNullPreservingAggregateSemantics()
    {
        var db = NewDb();
        var created = await CreateFeatureAsync(db);

        var dto = await Handler(db).Patch(
            new PatchFeatureRequest
            {
                Id = created.Id,
                CallerUserId = 1,
                Description = "   ",
            },
            TestServerCallContext.Create());

        dto.Description.Should().Be(string.Empty);

        var stored = await db.Features.AsNoTracking().SingleAsync(f => f.Id == created.Id);
        stored.Description.Should().BeNull();
    }

    [Fact]
    public async Task Patch_LeadUserIdZero_ThrowsInvalidArgument()
    {
        var validator = new PatchFeatureRequestValidator();
        var request = new PatchFeatureRequest
        {
            Id = 1,
            CallerUserId = 1,
            LeadUserId = 0,
        };

        var act = () => ValidationPipeline.ValidateAsync(validator, request);

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Patch_UnknownFeatureId_ThrowsNotFound()
    {
        var db = NewDb();

        var act = () => Handler(db).Patch(
            new PatchFeatureRequest
            {
                Id = 999,
                CallerUserId = 1,
                Title = "X",
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.NotFound);
    }

    [Fact]
    public async Task Patch_WhenCallerIsNotOwner_ThrowsPermissionDenied()
    {
        var db = NewDb();
        var created = await CreateFeatureAsync(db, managerUserId: 5);

        var act = () => Handler(db).Patch(
            new PatchFeatureRequest
            {
                Id = created.Id,
                CallerUserId = 6,
                Title = "Pwned",
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.PermissionDenied);

        var stored = await db.Features.AsNoTracking().SingleAsync(f => f.Id == created.Id);
        stored.Title.Should().Be("Original");
    }

    [Fact]
    public async Task Patch_WhenCallerUserIdIsMissing_ThrowsPermissionDenied()
    {
        var db = NewDb();
        var created = await CreateFeatureAsync(db);

        var act = () => Handler(db).Patch(
            new PatchFeatureRequest
            {
                Id = created.Id,
                Title = "X",
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.PermissionDenied);
    }

    [Fact]
    public async Task Patch_WithStaleExpectedVersion_ThrowsAlreadyExistsWithConflictMarker()
    {
        var db = NewDb();
        var created = await CreateFeatureAsync(db);
        await Handler(db).Patch(
            new PatchFeatureRequest
            {
                Id = created.Id,
                CallerUserId = 1,
                Title = "First",
            },
            TestServerCallContext.Create());

        var act = () => Handler(db).Patch(
            new PatchFeatureRequest
            {
                Id = created.Id,
                CallerUserId = 1,
                Title = "Second",
                ExpectedVersion = created.Version,
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.AlreadyExists);
        ex.Which.Status.Detail.Should().Contain("|conflict=");
        ex.Which.Status.Detail.Should().Contain("\"kind\":\"version\"");
        ex.Which.Status.Detail.Should().StartWith("Updated by someone else");
    }

    [Fact]
    public async Task Patch_WithoutExpectedVersion_SkipsConcurrencyCheck()
    {
        var db = NewDb();
        var created = await CreateFeatureAsync(db);
        await Handler(db).Patch(
            new PatchFeatureRequest
            {
                Id = created.Id,
                CallerUserId = 1,
                Title = "First",
            },
            TestServerCallContext.Create());

        var dto = await Handler(db).Patch(
            new PatchFeatureRequest
            {
                Id = created.Id,
                CallerUserId = 1,
                Title = "Second",
            },
            TestServerCallContext.Create());

        dto.Title.Should().Be("Second");
        dto.Version.Should().Be(created.Version + 2);
    }

    [Fact]
    public async Task Patch_PreservesStagePlansInResponseShape()
    {
        var db = NewDb();
        var created = await CreateFeatureAsync(db);

        var dto = await Handler(db).Patch(
            new PatchFeatureRequest
            {
                Id = created.Id,
                CallerUserId = 1,
                Title = "Renamed",
            },
            TestServerCallContext.Create());

        dto.StagePlans.Count.Should().Be(created.StagePlans.Count);
        dto.StagePlans.Count.Should().BeGreaterThan(0);
    }
}
