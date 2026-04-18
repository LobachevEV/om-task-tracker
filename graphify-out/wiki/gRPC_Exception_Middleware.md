# gRPC Exception Middleware

> 10 nodes · cohesion 0.33

## Key Concepts

- **GrpcExceptionMiddlewareTests** (7 connections) — `tests/OneMoreTaskTracker.Api.Tests/Middleware/GrpcExceptionMiddlewareTests.cs`
- **.InvokeWithException()** (5 connections) — `tests/OneMoreTaskTracker.Api.Tests/Middleware/GrpcExceptionMiddlewareTests.cs`
- **.InvokeAsync()** (4 connections) — `OneMoreTaskTracker.Api/Middleware/GrpcExceptionMiddleware.cs`
- **.GetResponseBody()** (3 connections) — `tests/OneMoreTaskTracker.Api.Tests/Middleware/GrpcExceptionMiddlewareTests.cs`
- **.InvokeAsync_MapsGrpcStatusToHttpStatus()** (3 connections) — `tests/OneMoreTaskTracker.Api.Tests/Middleware/GrpcExceptionMiddlewareTests.cs`
- **.InvokeAsync_ResponseIsValidJson()** (3 connections) — `tests/OneMoreTaskTracker.Api.Tests/Middleware/GrpcExceptionMiddlewareTests.cs`
- **GrpcExceptionMiddleware** (2 connections) — `OneMoreTaskTracker.Api/Middleware/GrpcExceptionMiddleware.cs`
- **.InvokeAsync_LogsTheException()** (2 connections) — `tests/OneMoreTaskTracker.Api.Tests/Middleware/GrpcExceptionMiddlewareTests.cs`
- **.InvokeAsync_WhenNoException_PassesThrough()** (2 connections) — `tests/OneMoreTaskTracker.Api.Tests/Middleware/GrpcExceptionMiddlewareTests.cs`
- **GrpcExceptionMiddleware.cs** (1 connections) — `OneMoreTaskTracker.Api/Middleware/GrpcExceptionMiddleware.cs`

## Relationships

- No strong cross-community connections detected

## Source Files

- `OneMoreTaskTracker.Api/Middleware/GrpcExceptionMiddleware.cs`
- `tests/OneMoreTaskTracker.Api.Tests/Middleware/GrpcExceptionMiddlewareTests.cs`

## Audit Trail

- EXTRACTED: 27 (84%)
- INFERRED: 5 (16%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*