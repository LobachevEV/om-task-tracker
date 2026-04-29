using FluentAssertions;
using OneMoreTaskTracker.Proto.Tasks.AttachTaskCommand;
using OneMoreTaskTracker.Tasks.Tasks.Attach;
using Xunit;

namespace OneMoreTaskTracker.Tasks.Tests.Validation;

public sealed class AttachTaskToFeatureRequestValidatorTests
{
    [Fact]
    public async Task Validate_WhenJiraTaskIdIsEmpty_FailsWithJiraTaskIdRequiredMessage()
    {
        var validator = new AttachTaskToFeatureRequestValidator();
        var request = new AttachTaskToFeatureRequest { JiraTaskId = string.Empty, FeatureId = 5 };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle()
            .Which.ErrorMessage.Should().Be("jira_task_id is required");
    }

    [Fact]
    public async Task Validate_WhenFeatureIdIsZero_FailsWithFeatureIdRequiredMessage()
    {
        var validator = new AttachTaskToFeatureRequestValidator();
        var request = new AttachTaskToFeatureRequest { JiraTaskId = "TASK-1", FeatureId = 0 };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle()
            .Which.ErrorMessage.Should().Be("feature_id is required");
    }

    [Fact]
    public async Task Validate_WhenBothFieldsMissing_ReportsBothFailures()
    {
        var validator = new AttachTaskToFeatureRequestValidator();
        var request = new AttachTaskToFeatureRequest { JiraTaskId = string.Empty, FeatureId = 0 };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Select(e => e.ErrorMessage).Should().BeEquivalentTo(
            "jira_task_id is required",
            "feature_id is required");
    }

    [Fact]
    public async Task Validate_WhenBothFieldsValid_Passes()
    {
        var validator = new AttachTaskToFeatureRequestValidator();
        var request = new AttachTaskToFeatureRequest { JiraTaskId = "TASK-1", FeatureId = 9 };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeTrue();
    }
}
