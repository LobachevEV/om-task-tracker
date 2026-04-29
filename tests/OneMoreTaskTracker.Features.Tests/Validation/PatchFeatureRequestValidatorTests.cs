using FluentAssertions;
using OneMoreTaskTracker.Features.Features.Update;
using OneMoreTaskTracker.Proto.Features.PatchFeatureCommand;
using Xunit;

namespace OneMoreTaskTracker.Features.Tests.Validation;

public sealed class PatchFeatureRequestValidatorTests
{
    [Fact]
    public async Task Validate_WhenIdIsZero_FailsWithIdRequiredMessage()
    {
        var validator = new PatchFeatureRequestValidator();
        var request = new PatchFeatureRequest { Id = 0, CallerUserId = 1 };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(f => f.ErrorMessage == "id is required");
    }

    [Fact]
    public async Task Validate_WhenTitleIsBlank_FailsWithTitleRequiredMessage()
    {
        var validator = new PatchFeatureRequestValidator();
        var request = new PatchFeatureRequest { Id = 1, CallerUserId = 1, Title = "   " };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(f => f.ErrorMessage == "title is required");
    }

    [Fact]
    public async Task Validate_WhenTitleExceeds200Chars_FailsWithTitleTooLongMessage()
    {
        var validator = new PatchFeatureRequestValidator();
        var request = new PatchFeatureRequest { Id = 1, CallerUserId = 1, Title = new string('x', 201) };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(f => f.ErrorMessage == "title too long");
    }

    [Fact]
    public async Task Validate_WhenDescriptionExceeds4000Chars_FailsWithDescriptionTooLongMessage()
    {
        var validator = new PatchFeatureRequestValidator();
        var request = new PatchFeatureRequest { Id = 1, CallerUserId = 1, Description = new string('d', 4001) };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(f => f.ErrorMessage == "description too long");
    }

    [Fact]
    public async Task Validate_WhenLeadUserIdIsZero_FailsWithLeadUserIdRequiredMessage()
    {
        var validator = new PatchFeatureRequestValidator();
        var request = new PatchFeatureRequest { Id = 1, CallerUserId = 1, LeadUserId = 0 };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(f => f.ErrorMessage == "lead_user_id is required");
    }

    [Fact]
    public async Task Validate_WhenIdAndOptionalFieldsOmitted_Passes()
    {
        var validator = new PatchFeatureRequestValidator();
        var request = new PatchFeatureRequest { Id = 1, CallerUserId = 1 };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WhenAllPresentFieldsAreValid_Passes()
    {
        var validator = new PatchFeatureRequestValidator();
        var request = new PatchFeatureRequest
        {
            Id = 1,
            CallerUserId = 1,
            Title = "Renamed",
            Description = "ok",
            LeadUserId = 5,
        };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeTrue();
    }
}
