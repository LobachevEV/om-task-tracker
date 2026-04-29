using FluentAssertions;
using OneMoreTaskTracker.Proto.Tasks.CreateTaskCommand;
using OneMoreTaskTracker.Tasks.Tasks.Create;
using Xunit;

namespace OneMoreTaskTracker.Tasks.Tests.Validation;

public sealed class CreateTaskRequestValidatorTests
{
    [Fact]
    public async Task Validate_WhenFeatureIdIsZero_FailsWithFeatureIdRequiredMessage()
    {
        var validator = new CreateTaskRequestValidator();
        var request = new CreateTaskRequest { JiraTaskId = "TASK-1", UserId = 1, FeatureId = 0 };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle()
            .Which.ErrorMessage.Should().Be("feature_id is required");
    }

    [Fact]
    public async Task Validate_WhenFeatureIdIsNegative_FailsWithFeatureIdRequiredMessage()
    {
        var validator = new CreateTaskRequestValidator();
        var request = new CreateTaskRequest { JiraTaskId = "TASK-1", UserId = 1, FeatureId = -1 };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle()
            .Which.ErrorMessage.Should().Be("feature_id is required");
    }

    [Fact]
    public async Task Validate_WhenFeatureIdIsPositive_Passes()
    {
        var validator = new CreateTaskRequestValidator();
        var request = new CreateTaskRequest { JiraTaskId = "TASK-1", UserId = 1, FeatureId = 7 };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeTrue();
    }
}
