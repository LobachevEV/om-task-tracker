using FluentAssertions;
using OneMoreTaskTracker.Features.Features.List;
using OneMoreTaskTracker.Proto.Features.ListFeaturesQuery;
using Xunit;

namespace OneMoreTaskTracker.Features.Tests.Validation;

public sealed class ListFeaturesRequestValidatorTests
{
    [Fact]
    public async Task Validate_WhenWindowStartIsNotIso_FailsWithWindowFormatMessage()
    {
        var validator = new ListFeaturesRequestValidator();
        var request = new ListFeaturesRequest { WindowStart = "not-a-date" };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(f => f.ErrorMessage == "window_* must be YYYY-MM-DD");
    }

    [Fact]
    public async Task Validate_WhenWindowEndIsNotIso_FailsWithWindowFormatMessage()
    {
        var validator = new ListFeaturesRequestValidator();
        var request = new ListFeaturesRequest { WindowEnd = "30/12/2026" };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(f => f.ErrorMessage == "window_* must be YYYY-MM-DD");
    }

    [Fact]
    public async Task Validate_WhenBothWindowsValid_Passes()
    {
        var validator = new ListFeaturesRequestValidator();
        var request = new ListFeaturesRequest
        {
            WindowStart = "2026-05-01",
            WindowEnd = "2026-05-31",
        };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WhenWindowsOmitted_Passes()
    {
        var validator = new ListFeaturesRequestValidator();
        var request = new ListFeaturesRequest();

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeTrue();
    }
}
