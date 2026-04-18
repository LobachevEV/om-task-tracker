# Graph Report - .  (2026-04-18)

## Corpus Check
- Corpus is ~32,008 words - fits in a single context window. You may not need a graph.

## Summary
- 617 nodes · 911 edges · 75 communities detected
- Extraction: 79% EXTRACTED · 21% INFERRED · 0% AMBIGUOUS · INFERRED: 194 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_GitLab Proxy Handlers|GitLab Proxy Handlers]]
- [[_COMMUNITY_Task Creation & MR Queries|Task Creation & MR Queries]]
- [[_COMMUNITY_System Architecture & Docs|System Architecture & Docs]]
- [[_COMMUNITY_Integration Test Harness|Integration Test Harness]]
- [[_COMMUNITY_Branch Creation Handler|Branch Creation Handler]]
- [[_COMMUNITY_GitLab API Client|GitLab API Client]]
- [[_COMMUNITY_Task Domain Entity|Task Domain Entity]]
- [[_COMMUNITY_Auth Controllers & Pages|Auth Controllers & Pages]]
- [[_COMMUNITY_Merge MR Service|Merge MR Service]]
- [[_COMMUNITY_Frontend Auth Storage|Frontend Auth Storage]]
- [[_COMMUNITY_Auth Integration Tests|Auth Integration Tests]]
- [[_COMMUNITY_Create MR Extensions|Create MR Extensions]]
- [[_COMMUNITY_React App Overview (docs)|React App Overview (docs)]]
- [[_COMMUNITY_Codemap Navigation|Codemap Navigation]]
- [[_COMMUNITY_Database Migrations|Database Migrations]]
- [[_COMMUNITY_List Tasks Handler|List Tasks Handler]]
- [[_COMMUNITY_gRPC Exception Middleware|gRPC Exception Middleware]]
- [[_COMMUNITY_Backend Domain Docs|Backend Domain Docs]]
- [[_COMMUNITY_ClaimsPrincipal Extensions|ClaimsPrincipal Extensions]]
- [[_COMMUNITY_DB Model Snapshots|DB Model Snapshots]]
- [[_COMMUNITY_Frontend Toolchain|Frontend Toolchain]]
- [[_COMMUNITY_Error Boundary|Error Boundary]]
- [[_COMMUNITY_Auth Context & Login|Auth Context & Login]]
- [[_COMMUNITY_EF Core DbContexts|EF Core DbContexts]]
- [[_COMMUNITY_Dialogs & Shortcuts|Dialogs & Shortcuts]]
- [[_COMMUNITY_ErrorBoundary Tests|ErrorBoundary Tests]]
- [[_COMMUNITY_MRs Provider|MRs Provider]]
- [[_COMMUNITY_Tasks Initial Migration|Tasks Initial Migration]]
- [[_COMMUNITY_Projects Provider|Projects Provider]]
- [[_COMMUNITY_Users Initial Migration|Users Initial Migration]]
- [[_COMMUNITY_Frontend App Root|Frontend App Root]]
- [[_COMMUNITY_Integration Icon|Integration Icon]]
- [[_COMMUNITY_Auth API Client|Auth API Client]]
- [[_COMMUNITY_MR DTO & Extensions|MR DTO & Extensions]]
- [[_COMMUNITY_IMrsProvider Interface|IMrsProvider Interface]]
- [[_COMMUNITY_IProjectsProvider Interface|IProjectsProvider Interface]]
- [[_COMMUNITY_SVG Assets & Gradients|SVG Assets & Gradients]]
- [[_COMMUNITY_Test Utils|Test Utils]]
- [[_COMMUNITY_Integration Status Util|Integration Status Util]]
- [[_COMMUNITY_AuthContext Test Wrapper|AuthContext Test Wrapper]]
- [[_COMMUNITY_Spinner|Spinner]]
- [[_COMMUNITY_useTaskDetail Hook|useTaskDetail Hook]]
- [[_COMMUNITY_IMrInfo Interface|IMrInfo Interface]]
- [[_COMMUNITY_User Entity|User Entity]]
- [[_COMMUNITY_Program Entry Point|Program Entry Point]]
- [[_COMMUNITY_ClaimsPrincipal Helpers|ClaimsPrincipal Helpers]]
- [[_COMMUNITY_JWT Options|JWT Options]]
- [[_COMMUNITY_Roles Constants|Roles Constants]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_Vitest Config|Vitest Config]]
- [[_COMMUNITY_Frontend Test Setup|Frontend Test Setup]]
- [[_COMMUNITY_Integration Status Test|Integration Status Test]]
- [[_COMMUNITY_Task Type|Task Type]]
- [[_COMMUNITY_Auth Type|Auth Type]]
- [[_COMMUNITY_Auth Type Test|Auth Type Test]]
- [[_COMMUNITY_Task Constants|Task Constants]]
- [[_COMMUNITY_AppHeader|AppHeader]]
- [[_COMMUNITY_ConfirmDialog Test|ConfirmDialog Test]]
- [[_COMMUNITY_useTaskDetail Test|useTaskDetail Test]]
- [[_COMMUNITY_useKeyboardShortcut Test|useKeyboardShortcut Test]]
- [[_COMMUNITY_Zod Schemas|Zod Schemas]]
- [[_COMMUNITY_Schemas Test|Schemas Test]]
- [[_COMMUNITY_HTTP Client Test|HTTP Client Test]]
- [[_COMMUNITY_Tasks API Test|Tasks API Test]]
- [[_COMMUNITY_Auth API Test|Auth API Test]]
- [[_COMMUNITY_Fake MR Info|Fake MR Info]]
- [[_COMMUNITY_Proxy Program Entry|Proxy Program Entry]]
- [[_COMMUNITY_MergeRequestInfo Type|MergeRequestInfo Type]]
- [[_COMMUNITY_MergeRequest Entity|MergeRequest Entity]]
- [[_COMMUNITY_GitRepo Entity|GitRepo Entity]]
- [[_COMMUNITY_Project Entity|Project Entity]]
- [[_COMMUNITY_Result Type|Result Type]]
- [[_COMMUNITY_Tasks Program Entry|Tasks Program Entry]]
- [[_COMMUNITY_Users Program Entry|Users Program Entry]]
- [[_COMMUNITY_Mapster Mapping|Mapster Mapping]]

## God Nodes (most connected - your core abstractions)
1. `TasksControllerIntegrationTests` - 31 edges
2. `UserServiceHandlerTests` - 20 edges
3. `AuthControllerIntegrationTests` - 14 edges
4. `EventBasedProjectsProviderTests` - 14 edges
5. `TaskAddMrTests` - 11 edges
6. `MergeMrServiceTests` - 11 edges
7. `MrsProviderTests` - 10 edges
8. `TasksController` - 10 edges
9. `Microservice Architecture Design` - 10 edges
10. `Frontend React Application` - 10 edges

## Surprising Connections (you probably didn't know these)
- `React Logo SVG Asset` --used_in--> `OneMoreTaskTracker.WebClient (React Frontend)`  [EXTRACTED]
  OneMoreTaskTracker.WebClient/src/assets/react.svg → docs/CODEMAPS/architecture.md
- `fetchTasks()` --calls--> `authHeaders()`  [INFERRED]
  OneMoreTaskTracker.WebClient/src/shared/api/tasksApi.ts → OneMoreTaskTracker.WebClient/src/shared/api/httpClient.ts
- `fetchTaskDetail()` --calls--> `authHeaders()`  [INFERRED]
  OneMoreTaskTracker.WebClient/src/shared/api/tasksApi.ts → OneMoreTaskTracker.WebClient/src/shared/api/httpClient.ts
- `moveTask()` --calls--> `authHeaders()`  [INFERRED]
  OneMoreTaskTracker.WebClient/src/shared/api/tasksApi.ts → OneMoreTaskTracker.WebClient/src/shared/api/httpClient.ts
- `createTask()` --calls--> `authHeaders()`  [INFERRED]
  OneMoreTaskTracker.WebClient/src/shared/api/tasksApi.ts → OneMoreTaskTracker.WebClient/src/shared/api/httpClient.ts

## Hyperedges (group relationships)
- **Request Flow: Frontend → API → gRPC Services → GitLab** — webclient_frontend, api_gateway_rest, tasks_service, gitlab_proxy_service, gitlab_saas_external [EXTRACTED 1.00]
- **Task Creation & State Management Flow** — create_task_handler, task_state_lifecycle, find_mr_handler, task_table_schema [EXTRACTED 1.00]
- **Authentication & Authorization (User Registration → JWT)** — auth_controller, user_service_handler, jwt_authentication, bcrypt_password_hashing, role_based_access [EXTRACTED 1.00]
- **ASP.NET Core Integration Testing Stack** — TasksControllerIntegrationTests.cs, TasksController, NSubstitute_Mocking, FluentAssertions, xUnit [INFERRED]
- **GitLab Proxy Service Layer** — CreateBranchHandler, MergeMrService, IGitLabApiClient, gRPC_Proto_Messaging [INFERRED]
- **gRPC Streaming and Error Handling** — MrsProvider, MrFinder_gRPC, gRPC_Streaming_Pattern, CancellationToken_Pattern, RpcException_Handling [INFERRED]
- **React 19 + TypeScript + Vite Development Stack** — React_19, TypeScript, Vite, Vite_React_Plugin, Vite_React_SWC_Plugin [INFERRED]
- **JWT-Based Authorization for Task Management API** — JWT_Authentication, Role_Based_Access_Control, UserService_gRPC, TasksController [INFERRED]
- **Task State Lifecycle and Merge Workflow** — Task_State_Machine, TaskMover_gRPC_Service, MergeMrService, Handler_Pattern [INFERRED]

## Communities

### Community 0 - "GitLab Proxy Handlers"
Cohesion: 0.03
Nodes (44): AsyncEnumerableAdapter, CancellationToken Pattern, CreateBranchHandler, CreateBranchHandlerTests, FindMrRequest (Proto DTO), FindMrResponse (Proto DTO), FluentAssertions, IGitLabApiClient (+36 more)

### Community 1 - "Task Creation & MR Queries"
Cohesion: 0.06
Nodes (14): CreateTaskHandler, CreateTaskHandlerTests, EventBasedProjectsProviderTests, EventsExtension, FindEventsHandler, FindEventsHandlerTests, FindMrExtension, FindMrHandler (+6 more)

### Community 2 - "System Architecture & Docs"
Cohesion: 0.05
Nodes (44): OneMoreTaskTracker.Api (REST API Gateway), Microservice Architecture Design, AuthController (REST Endpoint), BCrypt Password Hashing (Work Factor 12), OneMoreTaskTracker System, OneMoreTaskTracker CLI (Console App), Code Conventions: C# Best Practices, CORS Configuration for Frontend Origin (+36 more)

### Community 3 - "Integration Test Harness"
Cohesion: 0.1
Nodes (5): ApiWebApplicationFactory, IClassFixture, TasksControllerIntegrationTests, TasksControllerWebApplicationFactory, WebApplicationFactory

### Community 4 - "Branch Creation Handler"
Cohesion: 0.13
Nodes (6): BranchesExtension, CreateBranchHandler, CreateBranchHandlerTests, GitLabApiClient, GitLabApiClientTests, IGitLabApiClient

### Community 5 - "GitLab API Client"
Cohesion: 0.1
Nodes (4): IDisposable, IGitLabApiClient, UserServiceHandler, UserServiceHandlerTests

### Community 6 - "Task Domain Entity"
Cohesion: 0.16
Nodes (3): Task, TaskAddMrTests, TaskAddProjectTests

### Community 7 - "Auth Controllers & Pages"
Cohesion: 0.13
Nodes (6): AuthController, ControllerBase, handleSubmit(), handleMoveConfirm(), handleSubmit(), TasksController

### Community 8 - "Merge MR Service"
Cohesion: 0.23
Nodes (3): MergeMrExtensions, MergeMrService, MergeMrServiceTests

### Community 9 - "Frontend Auth Storage"
Cohesion: 0.23
Nodes (9): clearAuth(), getAuth(), getToken(), authHeaders(), handleResponse(), createTask(), fetchTaskDetail(), fetchTasks() (+1 more)

### Community 10 - "Auth Integration Tests"
Cohesion: 0.33
Nodes (1): AuthControllerIntegrationTests

### Community 11 - "Create MR Extensions"
Cohesion: 0.23
Nodes (3): CreateMrExtensionTests, CreateMrExtension, CreateMrHandler

### Community 12 - "React App Overview (docs)"
Cohesion: 0.15
Nodes (13): AppHeader Shared Component, React Context for Authentication State, ErrorBoundary React Component, Frontend React Application, LoginPage React Component, React 19 with TypeScript, RegisterPage React Component, TaskDetailPage React Component (+5 more)

### Community 13 - "Codemap Navigation"
Cohesion: 0.21
Nodes (13): architecture.md Codemap, backend.md Codemap, CODEMAPS Navigation Hub, data.md Codemap, dependencies.md Codemap, frontend.md Codemap, Handler Pattern Architecture, TaskCreator (gRPC Service) (+5 more)

### Community 14 - "Database Migrations"
Cohesion: 0.18
Nodes (5): InitialCreate, OneMoreTaskTracker.Tasks.Migrations, InitialCreate, OneMoreTaskTracker.Users.Migrations, Migration

### Community 15 - "List Tasks Handler"
Cohesion: 0.4
Nodes (2): ListTasksHandler, ListTasksHandlerTests

### Community 16 - "gRPC Exception Middleware"
Cohesion: 0.33
Nodes (2): GrpcExceptionMiddleware, GrpcExceptionMiddlewareTests

### Community 17 - "Backend Domain Docs"
Cohesion: 0.24
Nodes (10): Backend Services Layer, OneMoreTaskTracker.Domain (Core Domain Logic), DevToRelease (DTR) Workflow, Entity Framework Core ORM with DbContext, Handler Pattern (One Per Use-Case), Mapster Data Mapping Library, MergeMrs (MMR) Workflow, Why providers abstract data access for testing (+2 more)

### Community 18 - "ClaimsPrincipal Extensions"
Cohesion: 0.36
Nodes (1): ClaimsPrincipalExtensionsTests

### Community 19 - "DB Model Snapshots"
Cohesion: 0.22
Nodes (5): ModelSnapshot, OneMoreTaskTracker.Tasks.Migrations, TasksDbContextModelSnapshot, OneMoreTaskTracker.Users.Migrations, UsersDbContextModelSnapshot

### Community 20 - "Frontend Toolchain"
Cohesion: 0.25
Nodes (8): ESLint Configuration, React 19, React Compiler, TypeScript, Vite Bundler, Vite React Plugin (@vitejs/plugin-react), Vite React SWC Plugin (@vitejs/plugin-react-swc), WebClient README Documentation

### Community 21 - "Error Boundary"
Cohesion: 0.25
Nodes (2): ErrorBoundary, renderWithRouter()

### Community 22 - "Auth Context & Login"
Cohesion: 0.29
Nodes (3): useAuth(), LoginPage(), ProtectedRoute()

### Community 23 - "EF Core DbContexts"
Cohesion: 0.29
Nodes (3): DbContext, TasksDbContext, UsersDbContext

### Community 24 - "Dialogs & Shortcuts"
Cohesion: 0.33
Nodes (3): ConfirmDialog(), ShortcutLegend(), useKeyboardShortcut()

### Community 25 - "ErrorBoundary Tests"
Cohesion: 0.5
Nodes (0): 

### Community 26 - "MRs Provider"
Cohesion: 0.5
Nodes (2): IMrsProvider, MrsProvider

### Community 27 - "Tasks Initial Migration"
Cohesion: 0.5
Nodes (2): InitialCreate, OneMoreTaskTracker.Tasks.Migrations

### Community 28 - "Projects Provider"
Cohesion: 0.5
Nodes (2): EventBasedProjectsProvider, IProjectsProvider

### Community 29 - "Users Initial Migration"
Cohesion: 0.5
Nodes (2): InitialCreate, OneMoreTaskTracker.Users.Migrations

### Community 30 - "Frontend App Root"
Cohesion: 0.67
Nodes (0): 

### Community 31 - "Integration Icon"
Cohesion: 1.0
Nodes (2): getSignalColor(), IntegrationIcon()

### Community 32 - "Auth API Client"
Cohesion: 0.67
Nodes (0): 

### Community 33 - "MR DTO & Extensions"
Cohesion: 0.67
Nodes (2): IMrInfo, MrDto

### Community 34 - "IMrsProvider Interface"
Cohesion: 0.67
Nodes (1): IMrsProvider

### Community 35 - "IProjectsProvider Interface"
Cohesion: 0.67
Nodes (1): IProjectsProvider

### Community 36 - "SVG Assets & Gradients"
Cohesion: 0.67
Nodes (3): Cyan to Purple Linear Gradient, Yellow to Orange Linear Gradient, Vite Logo SVG Asset

### Community 37 - "Test Utils"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Integration Status Util"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "AuthContext Test Wrapper"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Spinner"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "useTaskDetail Hook"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "IMrInfo Interface"
Cohesion: 1.0
Nodes (1): IMrInfo

### Community 43 - "User Entity"
Cohesion: 1.0
Nodes (1): User

### Community 44 - "Program Entry Point"
Cohesion: 1.0
Nodes (1): Program

### Community 45 - "ClaimsPrincipal Helpers"
Cohesion: 1.0
Nodes (1): ClaimsPrincipalExtensions

### Community 46 - "JWT Options"
Cohesion: 1.0
Nodes (1): JwtOptions

### Community 47 - "Roles Constants"
Cohesion: 1.0
Nodes (1): Roles

### Community 48 - "ESLint Config"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Vitest Config"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Frontend Test Setup"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Integration Status Test"
Cohesion: 1.0
Nodes (0): 

### Community 52 - "Task Type"
Cohesion: 1.0
Nodes (0): 

### Community 53 - "Auth Type"
Cohesion: 1.0
Nodes (0): 

### Community 54 - "Auth Type Test"
Cohesion: 1.0
Nodes (0): 

### Community 55 - "Task Constants"
Cohesion: 1.0
Nodes (0): 

### Community 56 - "AppHeader"
Cohesion: 1.0
Nodes (0): 

### Community 57 - "ConfirmDialog Test"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "useTaskDetail Test"
Cohesion: 1.0
Nodes (0): 

### Community 59 - "useKeyboardShortcut Test"
Cohesion: 1.0
Nodes (0): 

### Community 60 - "Zod Schemas"
Cohesion: 1.0
Nodes (0): 

### Community 61 - "Schemas Test"
Cohesion: 1.0
Nodes (0): 

### Community 62 - "HTTP Client Test"
Cohesion: 1.0
Nodes (0): 

### Community 63 - "Tasks API Test"
Cohesion: 1.0
Nodes (0): 

### Community 64 - "Auth API Test"
Cohesion: 1.0
Nodes (0): 

### Community 65 - "Fake MR Info"
Cohesion: 1.0
Nodes (0): 

### Community 66 - "Proxy Program Entry"
Cohesion: 1.0
Nodes (0): 

### Community 67 - "MergeRequestInfo Type"
Cohesion: 1.0
Nodes (0): 

### Community 68 - "MergeRequest Entity"
Cohesion: 1.0
Nodes (0): 

### Community 69 - "GitRepo Entity"
Cohesion: 1.0
Nodes (0): 

### Community 70 - "Project Entity"
Cohesion: 1.0
Nodes (0): 

### Community 71 - "Result Type"
Cohesion: 1.0
Nodes (0): 

### Community 72 - "Tasks Program Entry"
Cohesion: 1.0
Nodes (0): 

### Community 73 - "Users Program Entry"
Cohesion: 1.0
Nodes (0): 

### Community 74 - "Mapster Mapping"
Cohesion: 1.0
Nodes (1): Mapster Object Mapping

## Knowledge Gaps
- **59 isolated node(s):** `TestDto`, `IMrInfo`, `OneMoreTaskTracker.Tasks.Migrations`, `OneMoreTaskTracker.Tasks.Migrations`, `OneMoreTaskTracker.Tasks.Migrations` (+54 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Test Utils`** (2 nodes): `testUtils.ts`, `makeResponse()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Integration Status Util`** (2 nodes): `deriveIntegrations()`, `integrationStatus.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `AuthContext Test Wrapper`** (2 nodes): `wrapper()`, `AuthContext.test.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Spinner`** (2 nodes): `Spinner.tsx`, `Spinner()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `useTaskDetail Hook`** (2 nodes): `useTaskDetail.ts`, `useTaskDetail()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `IMrInfo Interface`** (2 nodes): `IMrInfo`, `IMrInfo.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `User Entity`** (2 nodes): `User.cs`, `User`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Program Entry Point`** (2 nodes): `Program.cs`, `Program`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ClaimsPrincipal Helpers`** (2 nodes): `ClaimsPrincipalExtensions`, `ClaimsPrincipalExtensions.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `JWT Options`** (2 nodes): `JwtOptions`, `JwtOptions.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Roles Constants`** (2 nodes): `Roles.cs`, `Roles`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ESLint Config`** (1 nodes): `eslint.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vitest Config`** (1 nodes): `vitest.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Frontend Test Setup`** (1 nodes): `setup.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Integration Status Test`** (1 nodes): `integrationStatus.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Task Type`** (1 nodes): `task.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth Type`** (1 nodes): `auth.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth Type Test`** (1 nodes): `auth.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Task Constants`** (1 nodes): `taskConstants.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `AppHeader`** (1 nodes): `AppHeader.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ConfirmDialog Test`** (1 nodes): `ConfirmDialog.test.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `useTaskDetail Test`** (1 nodes): `useTaskDetail.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `useKeyboardShortcut Test`** (1 nodes): `useKeyboardShortcut.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Zod Schemas`** (1 nodes): `schemas.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Schemas Test`** (1 nodes): `schemas.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `HTTP Client Test`** (1 nodes): `httpClient.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tasks API Test`** (1 nodes): `tasksApi.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth API Test`** (1 nodes): `authApi.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Fake MR Info`** (1 nodes): `FakeMrInfo.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Proxy Program Entry`** (1 nodes): `Program.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `MergeRequestInfo Type`** (1 nodes): `MergeRequestInfo.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `MergeRequest Entity`** (1 nodes): `MergeRequest.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `GitRepo Entity`** (1 nodes): `GitRepo.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Project Entity`** (1 nodes): `Project.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Result Type`** (1 nodes): `Result.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tasks Program Entry`** (1 nodes): `Program.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Users Program Entry`** (1 nodes): `Program.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Mapster Mapping`** (1 nodes): `Mapster Object Mapping`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `UserServiceHandlerTests` connect `GitLab API Client` to `GitLab Proxy Handlers`, `Auth Controllers & Pages`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `TasksControllerIntegrationTests` connect `Integration Test Harness` to `GitLab Proxy Handlers`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `AuthControllerIntegrationTests` connect `Auth Integration Tests` to `GitLab Proxy Handlers`, `Integration Test Harness`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `TestDto`, `IMrInfo`, `OneMoreTaskTracker.Tasks.Migrations` to the rest of the system?**
  _59 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `GitLab Proxy Handlers` be split into smaller, more focused modules?**
  _Cohesion score 0.03 - nodes in this community are weakly interconnected._
- **Should `Task Creation & MR Queries` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `System Architecture & Docs` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._