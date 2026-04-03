using System.Text.Json;
using FluentAssertions;
using Grpc.Core;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using NSubstitute;
using OneMoreTaskTracker.Api.Middleware;
using Xunit;

namespace OneMoreTaskTracker.Api.Tests.Middleware;

public sealed class GrpcExceptionMiddlewareTests
{
    private static async Task<HttpContext> InvokeWithException(RpcException? ex)
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        var logger = Substitute.For<ILogger<GrpcExceptionMiddleware>>();

        RequestDelegate next = ex == null
            ? ctx => { ctx.Response.StatusCode = 200; return Task.CompletedTask; }
            : _ => throw ex;

        var middleware = new GrpcExceptionMiddleware(next, logger);
        await middleware.InvokeAsync(context);

        return context;
    }

    private static async Task<string> GetResponseBody(HttpContext context)
    {
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(context.Response.Body);
        return await reader.ReadToEndAsync();
    }

    [Fact]
    public async Task InvokeAsync_WhenNoException_PassesThrough()
    {
        // Arrange
        // Act
        var context = await InvokeWithException(null);

        // Assert
        context.Response.StatusCode.Should().Be(200);
    }

    [Fact]
    public async Task InvokeAsync_WhenInvalidArgument_Returns400()
    {
        // Arrange
        var ex = new RpcException(new Status(StatusCode.InvalidArgument, "Invalid data"));

        // Act
        var context = await InvokeWithException(ex);

        // Assert
        context.Response.StatusCode.Should().Be(400);
        context.Response.ContentType.Should().Be("application/json");

        var body = await GetResponseBody(context);
        body.Should().Contain("Invalid request data");
    }

    [Fact]
    public async Task InvokeAsync_WhenNotFound_Returns404()
    {
        // Arrange
        var ex = new RpcException(new Status(StatusCode.NotFound, "Not found"));

        // Act
        var context = await InvokeWithException(ex);

        // Assert
        context.Response.StatusCode.Should().Be(404);
        var body = await GetResponseBody(context);
        body.Should().Contain("Resource not found");
    }

    [Fact]
    public async Task InvokeAsync_WhenAlreadyExists_Returns409()
    {
        // Arrange
        var ex = new RpcException(new Status(StatusCode.AlreadyExists, "Already exists"));

        // Act
        var context = await InvokeWithException(ex);

        // Assert
        context.Response.StatusCode.Should().Be(409);
        var body = await GetResponseBody(context);
        body.Should().Contain("Resource already exists");
    }

    [Fact]
    public async Task InvokeAsync_WhenUnauthenticated_Returns401()
    {
        // Arrange
        var ex = new RpcException(new Status(StatusCode.Unauthenticated, "Unauthenticated"));

        // Act
        var context = await InvokeWithException(ex);

        // Assert
        context.Response.StatusCode.Should().Be(401);
        var body = await GetResponseBody(context);
        body.Should().Contain("Authentication required");
    }

    [Fact]
    public async Task InvokeAsync_WhenPermissionDenied_Returns403()
    {
        // Arrange
        var ex = new RpcException(new Status(StatusCode.PermissionDenied, "Permission denied"));

        // Act
        var context = await InvokeWithException(ex);

        // Assert
        context.Response.StatusCode.Should().Be(403);
        var body = await GetResponseBody(context);
        body.Should().Contain("Permission denied");
    }

    [Fact]
    public async Task InvokeAsync_WhenDeadlineExceeded_Returns504()
    {
        // Arrange
        var ex = new RpcException(new Status(StatusCode.DeadlineExceeded, "Deadline exceeded"));

        // Act
        var context = await InvokeWithException(ex);

        // Assert
        context.Response.StatusCode.Should().Be(504);
        var body = await GetResponseBody(context);
        body.Should().Contain("Request timed out");
    }

    [Fact]
    public async Task InvokeAsync_WhenResourceExhausted_Returns429()
    {
        // Arrange
        var ex = new RpcException(new Status(StatusCode.ResourceExhausted, "Resource exhausted"));

        // Act
        var context = await InvokeWithException(ex);

        // Assert
        context.Response.StatusCode.Should().Be(429);
        var body = await GetResponseBody(context);
        body.Should().Contain("Too many requests");
    }

    [Fact]
    public async Task InvokeAsync_WhenUnavailable_Returns502()
    {
        // Arrange
        var ex = new RpcException(new Status(StatusCode.Unavailable, "Unavailable"));

        // Act
        var context = await InvokeWithException(ex);

        // Assert
        context.Response.StatusCode.Should().Be(502);
        var body = await GetResponseBody(context);
        body.Should().Contain("Service temporarily unavailable");
    }

    [Fact]
    public async Task InvokeAsync_WhenUnknownStatus_Returns502()
    {
        // Arrange
        var ex = new RpcException(new Status(StatusCode.Unknown, "Unknown error"));

        // Act
        var context = await InvokeWithException(ex);

        // Assert
        context.Response.StatusCode.Should().Be(502);
        var body = await GetResponseBody(context);
        body.Should().Contain("Service error");
    }

    [Fact]
    public async Task InvokeAsync_ResponseIsValidJson()
    {
        // Arrange
        var ex = new RpcException(new Status(StatusCode.InvalidArgument, "Invalid"));

        // Act
        var context = await InvokeWithException(ex);
        var body = await GetResponseBody(context);

        // Assert
        var act = () => JsonDocument.Parse(body);
        act.Should().NotThrow();

        using var doc = JsonDocument.Parse(body);
        doc.RootElement.TryGetProperty("error", out _).Should().BeTrue();
    }

    [Fact]
    public async Task InvokeAsync_ResponseHasErrorProperty()
    {
        // Arrange
        var ex = new RpcException(new Status(StatusCode.NotFound, "Not found"));

        // Act
        var context = await InvokeWithException(ex);
        var body = await GetResponseBody(context);

        // Assert
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        root.TryGetProperty("error", out var errorElement).Should().BeTrue();
        errorElement.GetString().Should().Be("Resource not found");
    }

    [Fact]
    public async Task InvokeAsync_LogsTheException()
    {
        // Arrange
        var loggingCalls = new List<string>();
        var logger = Substitute.For<ILogger<GrpcExceptionMiddleware>>();

        logger.IsEnabled(Arg.Any<LogLevel>()).Returns(true);
        logger
            .When(l => l.Log(
                Arg.Any<LogLevel>(),
                Arg.Any<EventId>(),
                Arg.Any<object>(),
                Arg.Any<Exception>(),
                Arg.Any<Func<object, Exception?, string>>()))
            .Do(x => loggingCalls.Add("logged"));

        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        var ex = new RpcException(new Status(StatusCode.NotFound, "Not found"));
        RequestDelegate next = _ => throw ex;

        var middleware = new GrpcExceptionMiddleware(next, logger);

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        loggingCalls.Should().Contain("logged");
    }
}
