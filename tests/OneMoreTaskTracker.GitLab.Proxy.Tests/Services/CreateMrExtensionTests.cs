using FluentAssertions;
using OneMoreTaskTracker.GitLab.Proxy.MergeRequests;
using OneMoreTaskTracker.GitLab.Proxy.Services;
using Xunit;

namespace OneMoreTaskTracker.GitLab.Proxy.Tests.Services;

public class CreateMrExtensionTests
{
    [Fact]
    public void Uri_HasCorrectProjectPath()
    {
        // Arrange
        var request = new CreateMrRequest { ProjectId = 123 };

        // Act
        var uri = request.Uri;

        // Assert
        uri.Should().NotBeNull();
        uri.ToString().Should().Be("projects/123/merge_requests");
    }

    [Fact]
    public void ToPostContent_WithMasterTarget_UsesReleaseLabel()
    {
        // Arrange
        var request = new CreateMrRequest
        {
            ProjectId = 1,
            SourceBranch = "feature/test",
            TargetBranch = "master",
            Title = "Release MR"
        };

        // Act
        var content = request.ToPostContent();

        // Assert
        content["labels"].Should().Be("release");
    }

    [Fact]
    public void ToPostContent_WithNonMasterTarget_UsesDevelopLabel()
    {
        // Arrange
        var request = new CreateMrRequest
        {
            ProjectId = 1,
            SourceBranch = "feature/test",
            TargetBranch = "develop",
            Title = "Feature MR"
        };

        // Act
        var content = request.ToPostContent();

        // Assert
        content["labels"].Should().Be("develop");
    }

    [Fact]
    public void ToPostContent_DefaultsRemoveSourceBranchAndSquashToTrue()
    {
        // Arrange
        var request = new CreateMrRequest
        {
            ProjectId = 1,
            SourceBranch = "feature/test",
            TargetBranch = "develop",
            Title = "Test MR"
        };

        // Act
        var content = request.ToPostContent();

        // Assert
        content["source_branch"].Should().Be("feature/test");
        content["target_branch"].Should().Be("develop");
        content["title"].Should().Be("Test MR");
        content["remove_source_branch"].Should().Be("true");
        content["squash"].Should().Be("true");
    }

    [Fact]
    public void ToPostContent_WithCustomFlags_RespectsFalseValues()
    {
        // Arrange
        var request = new CreateMrRequest
        {
            ProjectId = 1,
            SourceBranch = "feature/test",
            TargetBranch = "develop",
            Title = "Test MR"
        };

        // Act
        var content = request.ToPostContent(removeSourceBranch: false, squash: false);

        // Assert
        content["remove_source_branch"].Should().Be("false");
        content["squash"].Should().Be("false");
    }
}
