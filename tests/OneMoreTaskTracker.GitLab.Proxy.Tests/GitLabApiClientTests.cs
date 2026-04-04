using FluentAssertions;
using OneMoreTaskTracker.GitLab.Proxy;
using System.Net;
using Xunit;

namespace OneMoreTaskTracker.GitLab.Proxy.Tests;

public class GitLabApiClientTests
{
    private static HttpClient CreateClient(HttpResponseMessage response)
    {
        var handler = new MockHttpMessageHandler(response);
        return new HttpClient(handler) { BaseAddress = new Uri("http://test/") };
    }

    [Fact]
    public async Task Post_WhenSuccessAndBodyContainsId_ReturnsOkTrue()
    {
        // Arrange
        var responseContent = """
            {
              "id": 1,
              "title": "Test MR"
            }
            """;
        var response = new HttpResponseMessage(HttpStatusCode.Created)
        {
            Content = new StringContent(responseContent)
        };
        using var httpClient = CreateClient(response);
        var client = new GitLabApiClient(httpClient);

        // Act
        var (ok, responseText) = await client.Post(new Uri("http://test/merge_requests", UriKind.Absolute), CancellationToken.None);

        // Assert
        ok.Should().BeTrue();
        responseText.Should().Contain("\"id\"");
    }

    [Fact]
    public async Task Post_WhenSuccessButBodyLacksId_ReturnsOkFalse()
    {
        // Arrange
        var responseContent = """
            {
              "title": "Test MR"
            }
            """;
        var response = new HttpResponseMessage(HttpStatusCode.Created)
        {
            Content = new StringContent(responseContent)
        };
        using var httpClient = CreateClient(response);
        var client = new GitLabApiClient(httpClient);

        // Act
        var (ok, responseText) = await client.Post(new Uri("http://test/merge_requests", UriKind.Absolute), CancellationToken.None);

        // Assert
        ok.Should().BeFalse();
        responseText.Should().NotContain("\"id\"");
    }

    [Fact]
    public async Task Post_WhenFailureStatus_ReturnsOkFalse()
    {
        // Arrange
        var response = new HttpResponseMessage(HttpStatusCode.BadRequest)
        {
            Content = new StringContent("Invalid request")
        };
        using var httpClient = CreateClient(response);
        var client = new GitLabApiClient(httpClient);

        // Act
        var (ok, responseText) = await client.Post(new Uri("http://test/merge_requests", UriKind.Absolute), CancellationToken.None);

        // Assert
        ok.Should().BeFalse();
    }

    [Fact]
    public async Task Put_WhenSuccess_ReturnsSuccessResult()
    {
        // Arrange
        var responseContent = """
            {
              "id": 123
            }
            """;
        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(responseContent, System.Text.Encoding.UTF8, "application/json")
        };
        using var httpClient = CreateClient(response);
        var client = new GitLabApiClient(httpClient);

        // Act
        var result = await client.Put<TestDto>(new Uri("http://test/merge", UriKind.Absolute), CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Dto.Should().NotBeNull();
        result.Dto!.Id.Should().Be(123);
    }

    [Fact]
    public async Task Put_WhenFailure_ReturnsErrorResult()
    {
        // Arrange
        var response = new HttpResponseMessage(HttpStatusCode.Unauthorized)
        {
            ReasonPhrase = "Unauthorized access"
        };
        using var httpClient = CreateClient(response);
        var client = new GitLabApiClient(httpClient);

        // Act
        var result = await client.Put<TestDto>(new Uri("http://test/merge", UriKind.Absolute), CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Message.Should().Be("Unauthorized access");
    }

    [Fact]
    public async Task Post_WithContent_SendsFormUrlEncodedContent()
    {
        // Arrange
        var content = new Dictionary<string, string>
        {
            ["key1"] = "value1",
            ["key2"] = "value2"
        };
        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("""{"id": 1}""")
        };
        using var httpClient = CreateClient(response);
        var client = new GitLabApiClient(httpClient);

        // Act
        var (ok, _) = await client.Post(new Uri("http://test/merge_requests", UriKind.Absolute), content, CancellationToken.None);

        // Assert
        ok.Should().BeTrue();
    }

    private sealed class MockHttpMessageHandler(HttpResponseMessage response) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            return Task.FromResult(response);
        }
    }

    private record TestDto(int Id);
}
