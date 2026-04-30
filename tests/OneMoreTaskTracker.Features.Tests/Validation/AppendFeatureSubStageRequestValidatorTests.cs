using FluentAssertions;
using OneMoreTaskTracker.Features.Features.Update;
using OneMoreTaskTracker.Proto.Features.AppendFeatureSubStageCommand;
using Xunit;

namespace OneMoreTaskTracker.Features.Tests.Validation;

public sealed class AppendFeatureSubStageRequestValidatorTests
{
    private static readonly AppendFeatureSubStageRequestValidator Validator = new();

    [Fact]
    public async Task Validate_HappyPath_DevelopmentBackend_ReturnsValid()
    {
        var request = new AppendFeatureSubStageRequest
        {
            FeatureId = 1,
            CallerUserId = 1,
            Track = "backend",
            Phase = "development",
        };

        var result = await Validator.ValidateAsync(request);
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_UnknownTrack_Fails()
    {
        var request = new AppendFeatureSubStageRequest
        {
            FeatureId = 1,
            CallerUserId = 1,
            Track = "infra",
            Phase = "development",
        };

        var result = await Validator.ValidateAsync(request);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(f => f.ErrorMessage.Contains("track"));
    }

    [Fact]
    public async Task Validate_NonMultiOwnerPhase_Fails()
    {
        var request = new AppendFeatureSubStageRequest
        {
            FeatureId = 1,
            CallerUserId = 1,
            Track = "backend",
            Phase = "ethalon-testing",
        };

        var result = await Validator.ValidateAsync(request);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(f => f.ErrorMessage.Contains("phase"));
    }

    [Fact]
    public async Task Validate_BadDateOrder_Fails()
    {
        var request = new AppendFeatureSubStageRequest
        {
            FeatureId = 1,
            CallerUserId = 1,
            Track = "backend",
            Phase = "development",
            PlannedStart = "2026-06-15",
            PlannedEnd = "2026-06-01",
        };

        var result = await Validator.ValidateAsync(request);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(f => f.ErrorMessage.Contains("planned_end must be on or after"));
    }

    [Fact]
    public async Task Validate_MalformedDate_Fails()
    {
        var request = new AppendFeatureSubStageRequest
        {
            FeatureId = 1,
            CallerUserId = 1,
            Track = "backend",
            Phase = "development",
            PlannedStart = "06/15/2026",
        };

        var result = await Validator.ValidateAsync(request);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(f => f.ErrorMessage.Contains("YYYY-MM-DD"));
    }
}
