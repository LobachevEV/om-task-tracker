---
id: onemoretracker-jwt-gateway-only
trigger: "when adding authentication or authorization to OneMoreTaskTracker services"
confidence: 0.9
domain: security
source: local-repo-analysis
---

# JWT Auth Lives Only in OneMoreTaskTracker.Api — Microservices Trust the Gateway

## Action
Do NOT add JWT validation to `OneMoreTaskTracker.Tasks`, `OneMoreTaskTracker.Users`, or other gRPC
microservices. Authentication is the responsibility of `OneMoreTaskTracker.Api` exclusively.

The API gateway:
- Validates JWT tokens via `JwtTokenService`
- Uses `ClaimsPrincipalExtensions` to extract userId from claims
- Passes userId as a field in gRPC request messages downstream

Microservices receive `userId` as a plain `int32` in the proto request — they trust
it came through the authenticated gateway.

## Evidence
- `JwtOptions`, `JwtTokenService`, `Roles`, `ClaimsPrincipalExtensions` all exist
  only in `OneMoreTaskTracker.Api/Auth/`
- `CreateTaskRequest` proto has `int32 userId` — not a token, a plain ID
- Pattern is intentional: gRPC services are internal, not exposed to the internet

## How to apply
If user asks to "add auth" to a gRPC service, clarify: extract userId from the
existing JWT in OneMoreTaskTracker.Api and pass it through the gRPC request instead.
