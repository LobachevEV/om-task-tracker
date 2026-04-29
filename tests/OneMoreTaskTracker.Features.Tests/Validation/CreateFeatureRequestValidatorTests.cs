using FluentAssertions;
using OneMoreTaskTracker.Features.Features.Create;
using OneMoreTaskTracker.Proto.Features.CreateFeatureCommand;
using Xunit;

namespace OneMoreTaskTracker.Features.Tests.Validation;

public sealed class CreateFeatureRequestValidatorTests
{
    [Fact]
    public async Task Validate_WhenTitleIsEmpty_FailsWithTitleRequiredMessage()
    {
        var validator = new CreateFeatureRequestValidator();
        var request = new CreateFeatureRequest { Title = "", ManagerUserId = 1 };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(f => f.ErrorMessage == "title is required");
    }

    [Fact]
    public async Task Validate_WhenTitleIsWhitespace_FailsWithTitleRequiredMessage()
    {
        var validator = new CreateFeatureRequestValidator();
        var request = new CreateFeatureRequest { Title = "   ", ManagerUserId = 1 };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(f => f.ErrorMessage == "title is required");
    }

    [Fact]
    public async Task Validate_WhenManagerUserIdIsZero_FailsWithManagerUserIdRequiredMessage()
    {
        var validator = new CreateFeatureRequestValidator();
        var request = new CreateFeatureRequest { Title = "X", ManagerUserId = 0 };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(f => f.ErrorMessage == "manager_user_id is required");
    }

    [Fact]
    public async Task Validate_WhenPlannedStartIsNotIso_FailsWithFormatMessage()
    {
        var validator = new CreateFeatureRequestValidator();
        var request = new CreateFeatureRequest { Title = "X", ManagerUserId = 1, PlannedStart = "not-a-date" };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(f => f.ErrorMessage == "planned_start must be YYYY-MM-DD");
    }

    [Fact]
    public async Task Validate_WhenPlannedEndIsNotIso_FailsWithFormatMessage()
    {
        var validator = new CreateFeatureRequestValidator();
        var request = new CreateFeatureRequest { Title = "X", ManagerUserId = 1, PlannedEnd = "30-12-2026" };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(f => f.ErrorMessage == "planned_end must be YYYY-MM-DD");
    }

    [Fact]
    public async Task Validate_WhenPlannedStartYearOutOfRange_FailsWithRealReleaseDateMessage()
    {
        var validator = new CreateFeatureRequestValidator();
        var request = new CreateFeatureRequest { Title = "X", ManagerUserId = 1, PlannedStart = "1899-01-01" };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(f => f.ErrorMessage == "Use a real release date");
    }

    [Fact]
    public async Task Validate_WhenPlannedEndBeforePlannedStart_FailsWithDateOrderMessage()
    {
        var validator = new CreateFeatureRequestValidator();
        var request = new CreateFeatureRequest
        {
            Title = "X",
            ManagerUserId = 1,
            PlannedStart = "2026-05-10",
            PlannedEnd = "2026-05-01",
        };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(f => f.ErrorMessage == "planned_end must be on or after planned_start");
    }

    [Fact]
    public async Task Validate_WhenAllFieldsAreValid_Passes()
    {
        var validator = new CreateFeatureRequestValidator();
        var request = new CreateFeatureRequest
        {
            Title = "Rollout",
            ManagerUserId = 42,
            PlannedStart = "2026-05-01",
            PlannedEnd = "2026-05-10",
        };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WhenDatesAreOmitted_Passes()
    {
        var validator = new CreateFeatureRequestValidator();
        var request = new CreateFeatureRequest { Title = "X", ManagerUserId = 1 };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeTrue();
    }
}
