using FluentAssertions;
using OneMoreTaskTracker.Features.Features.Get;
using OneMoreTaskTracker.Proto.Features.GetFeatureQuery;
using Xunit;

namespace OneMoreTaskTracker.Features.Tests.Validation;

public sealed class GetFeatureRequestValidatorTests
{
    [Fact]
    public async Task Validate_WhenIdIsZero_FailsWithIdRequiredMessage()
    {
        var validator = new GetFeatureRequestValidator();
        var request = new GetFeatureRequest { Id = 0 };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle()
            .Which.ErrorMessage.Should().Be("id is required");
    }

    [Fact]
    public async Task Validate_WhenIdIsNegative_FailsWithIdRequiredMessage()
    {
        var validator = new GetFeatureRequestValidator();
        var request = new GetFeatureRequest { Id = -1 };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle()
            .Which.ErrorMessage.Should().Be("id is required");
    }

    [Fact]
    public async Task Validate_WhenIdIsPositive_Passes()
    {
        var validator = new GetFeatureRequestValidator();
        var request = new GetFeatureRequest { Id = 7 };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeTrue();
    }
}
