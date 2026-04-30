using FluentAssertions;
using OneMoreTaskTracker.Features.Features.Update;
using OneMoreTaskTracker.Proto.Features.PatchFeatureGateCommand;
using Xunit;

namespace OneMoreTaskTracker.Features.Tests.Validation;

public sealed class PatchFeatureGateRequestValidatorTests
{
    private static readonly PatchFeatureGateRequestValidator Validator = new();

    [Fact]
    public async Task Validate_HappyPath_Approves_ReturnsValid()
    {
        var request = new PatchFeatureGateRequest
        {
            FeatureId = 1,
            CallerUserId = 1,
            GateKey = "spec",
            Status = "approved",
        };

        var result = await Validator.ValidateAsync(request);
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_RejectedWithoutReason_FailsWithReasonRequired()
    {
        var request = new PatchFeatureGateRequest
        {
            FeatureId = 1,
            CallerUserId = 1,
            GateKey = "spec",
            Status = "rejected",
            RejectionReason = "",
        };

        var result = await Validator.ValidateAsync(request);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(f => f.ErrorMessage.Contains("rejection_reason is required"));
    }

    [Fact]
    public async Task Validate_RejectedWithReasonOver500Chars_FailsWithLengthMessage()
    {
        var request = new PatchFeatureGateRequest
        {
            FeatureId = 1,
            CallerUserId = 1,
            GateKey = "spec",
            Status = "rejected",
            RejectionReason = new string('x', 501),
        };

        var result = await Validator.ValidateAsync(request);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(f => f.ErrorMessage.Contains("<= 500"));
    }

    [Fact]
    public async Task Validate_UnknownGateKey_Fails()
    {
        var request = new PatchFeatureGateRequest
        {
            FeatureId = 1,
            CallerUserId = 1,
            GateKey = "design.gate",
        };

        var result = await Validator.ValidateAsync(request);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(f => f.ErrorMessage.Contains("gate_key"));
    }

    [Fact]
    public async Task Validate_UnknownStatus_Fails()
    {
        var request = new PatchFeatureGateRequest
        {
            FeatureId = 1,
            CallerUserId = 1,
            GateKey = "spec",
            Status = "approving",
        };

        var result = await Validator.ValidateAsync(request);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(f => f.ErrorMessage.Contains("status"));
    }
}
