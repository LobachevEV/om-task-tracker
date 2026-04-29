using FluentAssertions;
using Grpc.Core;
using OneMoreTaskTracker.Proto.Tasks.AttachTaskCommand;
using OneMoreTaskTracker.Tasks.Tasks.Attach;
using Xunit;

namespace OneMoreTaskTracker.Tasks.Tests.Validation;

public sealed class DetachTaskFromFeatureRequestValidatorTests
{
    [Fact]
    public async Task Validate_WhenReassignToFeatureIdIsZero_FailsWithFailedPreconditionState()
    {
        var validator = new DetachTaskFromFeatureRequestValidator();
        var request = new DetachTaskFromFeatureRequest { JiraTaskId = "TASK-1", ReassignToFeatureId = 0 };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        var failure = result.Errors.Should().ContainSingle().Subject;
        failure.ErrorMessage.Should().Be(
            "detach requires reassign_to_feature_id because Task.FeatureId is non-nullable");
        failure.CustomState.Should().Be(StatusCode.FailedPrecondition);
    }

    [Fact]
    public async Task Validate_WhenReassignToFeatureIdIsPositive_Passes()
    {
        var validator = new DetachTaskFromFeatureRequestValidator();
        var request = new DetachTaskFromFeatureRequest { JiraTaskId = "TASK-1", ReassignToFeatureId = 11 };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeTrue();
    }
}
