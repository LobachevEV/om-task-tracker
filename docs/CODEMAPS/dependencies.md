<!-- Generated: 2026-04-03 | Files scanned: 22 | Token estimate: ~850 -->

# OneMoreTaskTracker External Dependencies & APIs Codemap

**Last Updated:** 2026-04-03

## External Services

### GitLab (SaaS)

**Purpose:** Source of truth for merge requests, branches, projects, events.

**Authentication:** Personal Access Token (GITLAB_TOKEN environment variable)

#### HTTP API Endpoints

| Endpoint                                                  | Method | Handler               | File                                            |
|-----------------------------------------------------------|--------|-----------------------|-------------------------------------------------|
| `GET /api/v4/merge_requests`                              | GET    | `FindMrHandler`       | `/Gitlab.Proxy/Services/FindMrHandler.cs`       |
| `POST /api/v4/projects/{id}/merge_requests`               | POST   | `CreateMrHandler`     | `/Gitlab.Proxy/Services/CreateMrHandler.cs`     |
| `PUT /api/v4/projects/{id}/merge_requests/{mr_iid}/merge` | PUT    | `MergeMrService`      | `/Gitlab.Proxy/Services/MergeMrService.cs`      |
| `GET /api/v4/events`                                      | GET    | `FindEventsHandler`   | `/Gitlab.Proxy/Services/FindEventsHandler.cs`   |
| `GET /api/v4/projects/{id}`                               | GET    | `GetProjectHandler`   | `/Gitlab.Proxy/Services/GetProjectHandler.cs`   |
| `POST /api/v4/projects/{id}/repository/branches`          | POST   | `CreateBranchHandler` | `/Gitlab.Proxy/Services/CreateBranchHandler.cs` |

#### Query Parameters

**MR Search (FindMrHandler):**
```
GET /merge_requests?scope=all&state=opened&search={taskId}&per_page=40&labels={label1},{label2}
```

**Events (FindEventsHandler):**
```
GET /events?user_id={userId}&action=pushed&created_after={timestamp}
```

**Response Streaming:** All GitLab API responses are streamed through gRPC services.

---

### PostgreSQL Database

Two separate databases (schema-per-microservice):

**Tasks Database**
- **Connection:** `Host=localhost;Port=5432;Database=Tasks;Username=postgres`
- **Service:** `OneMoreTaskTracker.Tasks`
- **Migrations:** Auto-applied on startup from `/OneMoreTaskTracker.Tasks/Migrations/`

**Users Database**
- **Connection:** `Host=localhost;Port=5432;Database=Users;Username=postgres`
- **Service:** `OneMoreTaskTracker.Users`
- **Migrations:** Auto-applied on startup from `/OneMoreTaskTracker.Users/Migrations/`

---

## NuGet Package Dependencies

### Backend (.NET 10.0)

#### ASP.NET Core & gRPC
```xml
<PackageReference Include="Microsoft.AspNetCore.App" />
<PackageReference Include="Grpc.AspNetCore" Version="2.x" />
<PackageReference Include="Grpc.Net.Client" Version="2.x" />
```

#### Entity Framework Core
```xml
<PackageReference Include="Microsoft.EntityFrameworkCore" Version="8.x" />
<PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="8.x" />
<PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="8.x" />
```

#### Authentication & Security (OneMoreTaskTracker.Api, OneMoreTaskTracker.Users)
```xml
<PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" />
<PackageReference Include="Microsoft.IdentityModel.Tokens" />
<PackageReference Include="BCrypt.Net-Next" />  <!-- work factor 12 for password hashing -->
```

#### Data Mapping
```xml
<PackageReference Include="Mapster" Version="12.x" />
<PackageReference Include="Mapster.DependencyInjection" Version="1.x" />
```

#### Configuration & Logging
```xml
<PackageReference Include="Microsoft.Extensions.Configuration" />
<PackageReference Include="Microsoft.Extensions.Configuration.CommandLine" />
<PackageReference Include="Microsoft.Extensions.Configuration.EnvironmentVariables" />
<PackageReference Include="Microsoft.Extensions.Configuration.UserSecrets" />
<PackageReference Include="Microsoft.Extensions.Logging" />
<PackageReference Include="Microsoft.Extensions.DependencyInjection" />
```

#### HTTP Client
```xml
<PackageReference Include="Microsoft.Extensions.Http" />
<PackageReference Include="System.Net.Http.Json" />
<PackageReference Include="Microsoft.AspNetCore.WebUtilities" />
```

#### Object Pooling
```xml
<PackageReference Include="Microsoft.Extensions.ObjectPool" />
```

#### Protocol Buffers
```xml
<PackageReference Include="Google.Protobuf" Version="3.x" />
```

---

### Frontend (Node.js)

#### React & DOM
```json
{
  "react": "^19.2.0",
  "react-dom": "^19.2.0"
}
```

#### Build Tools
```json
{
  "vite": "^7.3.1",
  "@vitejs/plugin-react": "^5.1.1"
}
```

#### Development & Type Checking
```json
{
  "typescript": "~5.9.3",
  "@types/react": "^19.2.7",
  "@types/react-dom": "^19.2.3",
  "@types/node": "^24.10.1"
}
```

#### Routing
```json
{
  "react-router-dom": "^7.13.2"
}
```

#### Validation
```json
{
  "zod": "^4.3.6"
}
```

#### Testing
```json
{
  "vitest": "^4.1.2",
  "@testing-library/react": "^16.3.2",
  "@testing-library/user-event": "^14.6.1",
  "@testing-library/jest-dom": "^6.9.1",
  "jsdom": "^29.0.1"
}
```

#### Linting
```json
{
  "eslint": "^9.39.1",
  "@eslint/js": "^9.39.1",
  "typescript-eslint": "^8.48.0",
  "eslint-plugin-react-hooks": "^7.0.1",
  "eslint-plugin-react-refresh": "^0.4.24",
  "globals": "^16.5.0"
}
```

---

## Environment Variables

### OneMoreTaskTracker CLI (`OneMoreTaskTracker/`)

```bash
# Required
GITLAB_TOKEN=glpat-xxxxxxxxxxxx          # Personal Access Token
GITLAB_USER_ID=12345                     # GitLab User ID

# Optional
GITLAB_BASE_URL=https://gitlab.company.com  # Default: https://gitlab.com
```

### OneMoreTaskTracker.GitLab.Proxy

```bash
# appsettings.json
GitLab__BaseUrl=https://gitlab.company.com
GitLab__Token=glpat-xxxxxxxxxxxx
```

### OneMoreTaskTracker.Tasks

```bash
# appsettings.json
ConnectionStrings__TasksContext=Host=localhost;Port=5432;Database=Tasks;...
GitLabProxy__Address=http://localhost:5176
```

### OneMoreTaskTracker.Users _(new)_

```bash
# appsettings.json
ConnectionStrings__UsersContext=Host=localhost;Port=5432;Database=Users;...
# Port: 5103 (HTTP/2, gRPC only — no public REST)
```

### OneMoreTaskTracker.Api _(new)_

```bash
# appsettings.json
TasksService__Address=http://localhost:5102
UsersService__Address=http://localhost:5103
Jwt__Secret=<at-least-32-char-secret>   # CHANGE in production; use env var
Jwt__Issuer=OneMoreTaskTracker
Jwt__Audience=OneMoreTaskTracker
Jwt__ExpirationMinutes=480              # 8h default; TODO: reduce + add refresh tokens
Cors__AllowedOrigins__0=http://localhost:5173
```

### OneMoreTaskTracker.WebClient

```bash
# Environment variable or .env file
VITE_API_BASE_URL=http://localhost:5000
```

---

## gRPC Service Dependencies

### OneMoreTaskTracker.Api → OneMoreTaskTracker.Tasks + OneMoreTaskTracker.Users

```csharp
// OneMoreTaskTracker.Api/Program.cs
builder.Services.AddGrpcClient<TaskCreator.TaskCreatorClient>(o => o.Address = new Uri(tasksServiceAddress));
builder.Services.AddGrpcClient<TaskLister.TaskListerClient>(o => o.Address = new Uri(tasksServiceAddress));
builder.Services.AddGrpcClient<UserService.UserServiceClient>(o => o.Address = new Uri(usersServiceAddress));
```

### OneMoreTaskTracker.Tasks → OneMoreTaskTracker.GitLab.Proxy

```csharp
// Registered in OneMoreTaskTracker.Tasks/Program.cs
builder.Services
    .AddGrpcClient<MrFinder.MrFinderClient>(opts =>
        opts.Address = new Uri("http://localhost:5176"))
    .EnableCallContextPropagation();
// Similar for: EventsFinder, BranchesCreator, ProjectGetter, MrCreator, MrMerger
```

**Resolution Flow:**
```
CreateTaskHandler.Create()
  → IMrsProvider.Find() → MrsProvider
    → gRPC call to MrFinder (on Proxy) → HTTP call to GitLab
  → IProjectsProvider.Get() → EventBasedProjectsProvider
    → gRPC call to EventsFinder (on Proxy) → HTTP call to GitLab
```

---

## GitLab API Response Models

**File:** `/OneMoreTaskTracker.GitLab.Api/`

### MergeRequestDto (MrDto in proto)

```csharp
public class MrDto
{
    public int Iid { get; set; }
    public int ProjectId { get; set; }
    public string ProjectName { get; set; }
    public string Title { get; set; }
    public string SourceBranch { get; set; }
    public string TargetBranch { get; set; }
    public string[] Labels { get; set; }
}
```

### EventDto

```csharp
public class EventDto
{
    public int ProjectId { get; set; }
    public string Branch { get; set; }
    public string TaskName { get; set; }
}
```

### ProjectDto

```csharp
public class ProjectDto
{
    public int Id { get; set; }
    public string Name { get; set; }
}
```

---

## Proto Service Interfaces

### Service Definitions

```protobuf
// MergeRequests (OneMoreTaskTracker.GitLab.Proxy)
service MrFinder   { rpc Find(FindMrRequest) returns (stream FindMrResponse); }
service MrCreator  { rpc Create(stream CreateMrRequest) returns (stream CreateMrResponse); }
service MrMerger   { rpc Merge(stream MergeMrRequest) returns (stream MergeMrResponse); }

// Branches (OneMoreTaskTracker.GitLab.Proxy)
service BranchesCreator { rpc Create(stream CreateBranchRequest) returns (stream CreateBranchResponse); }

// Events (OneMoreTaskTracker.GitLab.Proxy)
service EventsFinder { rpc Find(FindEventsRequest) returns (stream FindEventsResponse); }

// Projects (OneMoreTaskTracker.GitLab.Proxy)
service ProjectGetter { rpc Get(GetProjectQuery) returns (GetProjectResponse); }

// Tasks (OneMoreTaskTracker.Tasks)
service TaskCreator { rpc Create(CreateTaskRequest) returns (stream CreateTaskResponse); }
service TaskGetter  { rpc Get(GetTaskRequest) returns (GetTaskResponse); }
service TaskLister  { rpc ListTasks(ListTasksRequest) returns (ListTasksResponse); }

// Users (OneMoreTaskTracker.Users) — new
service UserService {
  rpc Register(RegisterRequest) returns (RegisterResponse);
  rpc Authenticate(AuthenticateRequest) returns (AuthenticateResponse);
  rpc GetTeamMemberIds(GetTeamMemberIdsRequest) returns (GetTeamMemberIdsResponse);
}
```

---

## Configuration Sources (Precedence)

### OneMoreTaskTracker.GitLab.Proxy
1. `appsettings.json`
2. `appsettings.{Environment}.json`
3. Environment variables (case-insensitive with `:` → `__`)
4. Command-line arguments (if applicable)

### OneMoreTaskTracker.Tasks
Same precedence as above.

### OneMoreTaskTracker CLI
1. User Secrets (`dotnet user-secrets`)
2. Command-line arguments (with switch mappings)
3. Environment variables
4. `appsettings.json`

### OneMoreTaskTracker.WebClient
1. `.env` file
2. Environment variables
3. `import.meta.env.VITE_*`

---

## Security Considerations

### Secrets Management

- **GITLAB_TOKEN:** Store in user secrets (`dotnet user-secrets`) or environment
- **Database password:** Use `appsettings.{Environment}.json` (not in repo) or environment
- **JWT Secret:** Minimum 32 chars; use env var in production (not appsettings.json)
- **API Base URL:** Can be environment-specific, not sensitive

### Network Security

- Services communicate via HTTP/2 (gRPC) on localhost in dev
- Production: Use TLS/HTTPS, restrict network access; consider mTLS between services
- gRPC reflection enabled only in Development environment
- `OneMoreTaskTracker.Users` has no public REST — only accessible via `OneMoreTaskTracker.Api` gRPC call

### Authentication

- JWT Bearer tokens: HMAC-SHA256, 8h default expiry
- Passwords: BCrypt with work factor 12
- TODO: Rate limiting on `/api/auth/*` (no brute-force protection yet)
- TODO: Refresh token flow (current tokens are long-lived)
- TODO: Move frontend token from localStorage to HttpOnly cookie (XSS risk)
- TODO: mTLS or internal service tokens for gRPC service-to-service calls

### Input Validation

- Task ID (Jira): String, min 1 / max 50 chars, validated in `CreateTaskPayload`
- Email: validated via `[EmailAddress]` + `MailAddress` parse in UserServiceHandler
- Password: minimum 8 chars
- User ID: Integer extracted from JWT claim (not user-supplied)
- Project ID: Integer from GitLab API
- Branch names: Validated by GitLab API

---

## Deployment Considerations

### Docker Support

Both Proxy and Tasks services have Dockerfiles:
- Base image: `mcr.microsoft.com/dotnet/aspnet:10.0`
- Exposed ports: 8080 (HTTP), 8081 (HTTPS)
- Multi-stage builds for optimization

### compose.yaml

Current `compose.yaml` covers the two stateless proxy/task services only (PostgreSQL, Users, and Api run outside Docker in dev):

```yaml
services:
  gitlab-proxy:
    image: onemoretracker-gitlab-proxy
    build:
      context: .
      dockerfile: OneMoreTaskTracker.GitLab.Proxy/Dockerfile
    ports:
      - "5176:8080"

  tasks:
    image: onemoretracker-tasks
    build:
      context: .
      dockerfile: OneMoreTaskTracker.Tasks/Dockerfile
    ports:
      - "5102:8080"
```

> Note: `OneMoreTaskTracker.Users`, `OneMoreTaskTracker.Api`, PostgreSQL, and the frontend are not yet in compose — run them with `dotnet run` / `npm run dev` locally.

---

## Related Codemaps

- See [architecture.md](architecture.md) for inter-service communication flow
- See [backend.md](backend.md) for handler implementation details
- See [data.md](data.md) for database schema
