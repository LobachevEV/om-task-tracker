using FluentAssertions;
using OneMoreTaskTracker.GitLab.Proxy.MergeRequests;
using OneMoreTaskTracker.GitLab.Proxy.Services;
using Xunit;

namespace OneMoreTaskTracker.GitLab.Proxy.Tests.Services;

public class MergeMrExtensionsTests
{
    [Fact]
    public void Uri_HasCorrectMergePath()
    {
        // Arrange
        var request = new MergeMrRequest
        {
            ProjectId = 456,
            MrId = 789
        };

        // Act
        var uri = request.Uri;

        // Assert
        uri.Should().NotBeNull();
        uri.ToString().Should().Be("projects/456/merge_requests/789/merge");
    }

    [Fact]
    public void Uri_ReturnsRelativeUri()
    {
        // Arrange
        var request = new MergeMrRequest { ProjectId = 1, MrId = 1 };

        // Act
        var uri = request.Uri;

        // Assert
        uri.IsAbsoluteUri.Should().BeFalse();
    }
}
