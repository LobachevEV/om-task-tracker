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
        var context = await InvokeWithException(null);
        context.Response.StatusCode.Should().Be(200);
    }

    public static TheoryData<StatusCode, int, string> StatusCodeMappings => new()
    {
        { StatusCode.InvalidArgument,   400, "Invalid request data" },
        { StatusCode.FailedPrecondition, 422, "Precondition failed" },
        { StatusCode.NotFound,          404, "Resource not found" },
        { StatusCode.AlreadyExists,     409, "Resource already exists" },
        { StatusCode.Unauthenticated,   401, "Authentication required" },
        { StatusCode.PermissionDenied,  403, "Permission denied" },
        { StatusCode.DeadlineExceeded,  504, "Request timed out" },
        { StatusCode.ResourceExhausted, 429, "Too many requests" },
        { StatusCode.Unavailable,       502, "Service temporarily unavailable" },
        { StatusCode.Unknown,           502, "Service error" },
    };

    [Theory]
    [MemberData(nameof(StatusCodeMappings))]
    public async Task InvokeAsync_MapsGrpcStatusToHttpStatus(StatusCode grpcStatus, int expectedHttp, string expectedMessage)
    {
        var ex = new RpcException(new Status(grpcStatus, "detail"));

        var context = await InvokeWithException(ex);
        var body = await GetResponseBody(context);

        context.Response.StatusCode.Should().Be(expectedHttp);
        context.Response.ContentType.Should().Be("application/json");
        body.Should().Contain(expectedMessage);
    }

    [Fact]
    public async Task InvokeAsync_ResponseIsValidJson()
    {
        var ex = new RpcException(new Status(StatusCode.InvalidArgument, "Invalid"));

        var context = await InvokeWithException(ex);
        var body = await GetResponseBody(context);

        var act = () => JsonDocument.Parse(body);
        act.Should().NotThrow();

        using var doc = JsonDocument.Parse(body);
        doc.RootElement.TryGetProperty("error", out _).Should().BeTrue();
    }

    [Fact]
    public async Task InvokeAsync_LogsTheException()
    {
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
            .Do(_ => loggingCalls.Add("logged"));

        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        var ex = new RpcException(new Status(StatusCode.NotFound, "Not found"));
        RequestDelegate next = _ => throw ex;

        var middleware = new GrpcExceptionMiddleware(next, logger);
        await middleware.InvokeAsync(context);

        loggingCalls.Should().Contain("logged");
    }
}
