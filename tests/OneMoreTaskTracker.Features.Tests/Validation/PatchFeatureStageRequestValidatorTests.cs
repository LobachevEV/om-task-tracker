using FluentAssertions;
using OneMoreTaskTracker.Features.Features.Update;
using OneMoreTaskTracker.Proto.Features.PatchFeatureStageCommand;
using Xunit;
using ProtoFeatureState = OneMoreTaskTracker.Proto.Features.FeatureState;

namespace OneMoreTaskTracker.Features.Tests.Validation;

public sealed class PatchFeatureStageRequestValidatorTests
{
    [Fact]
    public async Task Validate_WhenFeatureIdIsZero_FailsWithFeatureIdRequiredMessage()
    {
        var validator = new PatchFeatureStageRequestValidator();
        var request = new PatchFeatureStageRequest
        {
            FeatureId = 0,
            Stage = ProtoFeatureState.Development,
            CallerUserId = 1,
        };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(f => f.ErrorMessage == "feature_id is required");
    }

    [Fact]
    public async Task Validate_WhenStageIsUndefined_FailsWithStageRequiredMessage()
    {
        var validator = new PatchFeatureStageRequestValidator();
        var request = new PatchFeatureStageRequest
        {
            FeatureId = 1,
            Stage = (ProtoFeatureState)999,
            CallerUserId = 1,
        };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(f => f.ErrorMessage == "stage is required");
    }

    [Fact]
    public async Task Validate_WhenPlannedStartIsNotIso_FailsWithFormatMessage()
    {
        var validator = new PatchFeatureStageRequestValidator();
        var request = new PatchFeatureStageRequest
        {
            FeatureId = 1,
            Stage = ProtoFeatureState.Development,
            CallerUserId = 1,
            PlannedStart = "not-a-date",
        };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(f => f.ErrorMessage == "planned_start must be YYYY-MM-DD");
    }

    [Fact]
    public async Task Validate_WhenPlannedEndIsNotIso_FailsWithFormatMessage()
    {
        var validator = new PatchFeatureStageRequestValidator();
        var request = new PatchFeatureStageRequest
        {
            FeatureId = 1,
            Stage = ProtoFeatureState.Development,
            CallerUserId = 1,
            PlannedEnd = "30/12/2026",
        };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(f => f.ErrorMessage == "planned_end must be YYYY-MM-DD");
    }

    [Fact]
    public async Task Validate_WhenPlannedStartYearOutOfRange_FailsWithRealReleaseDateMessage()
    {
        var validator = new PatchFeatureStageRequestValidator();
        var request = new PatchFeatureStageRequest
        {
            FeatureId = 1,
            Stage = ProtoFeatureState.Development,
            CallerUserId = 1,
            PlannedStart = "1899-01-01",
        };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(f => f.ErrorMessage == "Use a real release date");
    }

    [Fact]
    public async Task Validate_WhenPlannedEndBeforePlannedStart_FailsWithDateOrderMessage()
    {
        var validator = new PatchFeatureStageRequestValidator();
        var request = new PatchFeatureStageRequest
        {
            FeatureId = 1,
            Stage = ProtoFeatureState.Development,
            CallerUserId = 1,
            PlannedStart = "2026-06-01",
            PlannedEnd = "2026-05-01",
        };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(f => f.ErrorMessage == "planned_end must be on or after planned_start");
    }

    [Fact]
    public async Task Validate_WhenAllFieldsAreValid_Passes()
    {
        var validator = new PatchFeatureStageRequestValidator();
        var request = new PatchFeatureStageRequest
        {
            FeatureId = 1,
            Stage = ProtoFeatureState.Development,
            CallerUserId = 1,
            PlannedStart = "2026-05-01",
            PlannedEnd = "2026-05-10",
        };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WhenDatesOmitted_Passes()
    {
        var validator = new PatchFeatureStageRequestValidator();
        var request = new PatchFeatureStageRequest
        {
            FeatureId = 1,
            Stage = ProtoFeatureState.Development,
            CallerUserId = 1,
        };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WhenPlannedStartIsEmptyString_Passes()
    {
        var validator = new PatchFeatureStageRequestValidator();
        var request = new PatchFeatureStageRequest
        {
            FeatureId = 1,
            Stage = ProtoFeatureState.Development,
            CallerUserId = 1,
            PlannedStart = string.Empty,
        };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeTrue();
    }
}
