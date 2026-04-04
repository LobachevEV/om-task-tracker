using FluentAssertions;
using OneMoreTaskTracker.GitLab.Proxy.MergeRequests;
using OneMoreTaskTracker.GitLab.Proxy.Services;
using Xunit;

namespace OneMoreTaskTracker.GitLab.Proxy.Tests.Services;

public class FindMrExtensionTests
{
    [Fact]
    public void Uri_ContainsCorrectQueryParams()
    {
        // Arrange
        var request = new FindMrRequest
        {
            MrState = "opened",
            Search = "TEST-1"
        };

        // Act
        var uri = request.Uri;

        // Assert
        uri.Should().NotBeNull();
        var uriString = uri.ToString();
        uriString.Should().Contain("scope=all");
        uriString.Should().Contain("state=opened");
        uriString.Should().Contain("search=TEST-1");
        uriString.Should().Contain("per_page=40");
    }

    [Fact]
    public void Uri_WithLabels_IncludesLabelsParam()
    {
        // Arrange
        var request = new FindMrRequest
        {
            MrState = "opened",
            Search = "TEST-1"
        };
        request.Labels.Add("bug");
        request.Labels.Add("urgent");

        // Act
        var uri = request.Uri;

        // Assert
        var uriString = uri.ToString();
        uriString.Should().Contain("labels=");
        uriString.Should().Contain("bug");
        uriString.Should().Contain("urgent");
    }

    [Fact]
    public void Uri_WithoutLabels_ExcludesLabelsParam()
    {
        // Arrange
        var request = new FindMrRequest
        {
            MrState = "opened",
            Search = "TEST-1"
        };

        // Act
        var uri = request.Uri;

        // Assert
        var uriString = uri.ToString();
        uriString.Should().NotContain("labels=");
    }

    [Fact]
    public void Uri_ReturnsRelativeUri()
    {
        // Arrange
        var request = new FindMrRequest { MrState = "opened" };

        // Act
        var uri = request.Uri;

        // Assert
        uri.IsAbsoluteUri.Should().BeFalse();
    }
}
