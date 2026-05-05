using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Features.Features.Data;

namespace OneMoreTaskTracker.Features.Tests.TestHelpers;

internal static class TestFeaturesDbContext
{
    public static FeaturesDbContext NewInMemory() =>
        new(new DbContextOptionsBuilder<FeaturesDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .AddInterceptors(new TrackedEntitySaveChangesInterceptor(TimeProvider.System))
            .Options);
}
