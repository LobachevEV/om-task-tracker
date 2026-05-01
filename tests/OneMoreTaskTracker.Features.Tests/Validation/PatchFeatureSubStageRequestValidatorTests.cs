using FluentAssertions;
using OneMoreTaskTracker.Features.Features.Update;
using OneMoreTaskTracker.Proto.Features.PatchFeatureSubStageCommand;
using Xunit;

namespace OneMoreTaskTracker.Features.Tests.Validation;

public sealed class PatchFeatureSubStageRequestValidatorTests
{
    private static readonly PatchFeatureSubStageRequestValidator Validator = new();

    [Fact]
    public async Task Validate_HappyPath_OwnerOnly_ReturnsValid()
    {
        var request = new PatchFeatureSubStageRequest
        {
            FeatureId = 1,
            SubStageId = 2,
            CallerUserId = 1,
            OwnerUserId = 7,
        };

        var result = await Validator.ValidateAsync(request);
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_BadDateOrder_Fails()
    {
        var request = new PatchFeatureSubStageRequest
        {
            FeatureId = 1,
            SubStageId = 2,
            CallerUserId = 1,
            PlannedStart = "2026-06-15",
            PlannedEnd = "2026-06-01",
        };

        var result = await Validator.ValidateAsync(request);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(f => f.ErrorMessage.Contains("planned_end must be on or after"));
    }

    [Fact]
    public async Task Validate_NegativeOwnerUserId_Fails()
    {
        var request = new PatchFeatureSubStageRequest
        {
            FeatureId = 1,
            SubStageId = 2,
            CallerUserId = 1,
            OwnerUserId = -3,
        };

        var result = await Validator.ValidateAsync(request);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(f => f.ErrorMessage.Contains("owner_user_id"));
    }
}
