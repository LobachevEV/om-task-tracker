<!-- Generated: 2026-04-03 | Files scanned: 28 | Token estimate: ~850 -->

# OneMoreTaskTracker Frontend Codemap

**Last Updated:** 2026-04-03
**Framework:** React 19, TypeScript, Vite, react-router-dom v7
**Entry Point:** `/OneMoreTaskTracker.WebClient/src/main.tsx`

## Project Structure

```
OneMoreTaskTracker.WebClient/
├── package.json              (React 19, Vite 7, TypeScript 5.9, react-router-dom 7, zod 4, vitest 4)
├── tsconfig.json            (Strict mode, React JSX transform)
├── vite.config.ts           (React plugin)
├── src/
│   ├── main.tsx             (App mount: ReactDOM.createRoot)
│   ├── App.css              (Responsive mobile-first CSS)
│   ├── index.css            (Global styles)
│   ├── app/
│   │   └── App.tsx          (Root: ErrorBoundary + AuthProvider + BrowserRouter + Routes)
│   ├── features/
│   │   ├── auth/
│   │   │   ├── AuthContext.tsx   (React context: auth state, login, logout)
│   │   │   ├── LoginPage.tsx     (POST /api/auth/login, store JWT)
│   │   │   ├── RegisterPage.tsx  (POST /api/auth/register, store JWT)
│   │   │   └── ProtectedRoute.tsx (Redirect to /login if not authenticated)
│   │   └── tasks/
│   │       ├── TaskPage.tsx       (Task list, create, filter by state)
│   │       └── TaskDetailPage.tsx (Task detail: MRs, projects, move state)
│   ├── shared/
│   │   ├── api/
│   │   │   ├── schemas.ts         (Zod validation schemas for all API types)
│   │   │   ├── httpClient.ts      (Fetch wrapper: auth headers, error handling, 401→redirect)
│   │   │   ├── authApi.ts         (register, login HTTP calls)
│   │   │   ├── tasksApi.ts        (fetchTasks, fetchTaskDetail, createTask, moveTask)
│   │   │   └── __tests__/schemas.test.ts
│   │   ├── auth/
│   │   │   ├── auth.ts            (localStorage helpers: getAuth, setAuth, clearAuth)
│   │   │   └── __tests__/auth.test.ts
│   │   ├── components/
│   │   │   ├── AppHeader.tsx      (Shared header with logout)
│   │   │   ├── ConfirmDialog.tsx  (Reusable confirmation modal)
│   │   │   ├── ErrorBoundary.tsx  (React error boundary)
│   │   │   └── Spinner.tsx        (Loading spinner)
│   │   ├── constants/
│   │   │   └── taskConstants.ts   (State label/badge maps)
│   │   ├── hooks/
│   │   │   ├── useTaskDetail.ts   (Fetch + move task state hook)
│   │   │   └── __tests__/useTaskDetail.test.ts
│   │   └── types/
│   │       ├── auth.ts            (UserRole, AuthState)
│   │       └── task.ts            (TaskState, Task, TaskDetail, Project, MergeRequest, MoveTaskResult, CreateTaskPayload)
│   ├── assets/
│   │   └── react.svg
│   └── test/
│       └── setup.ts              (Vitest + @testing-library/jest-dom setup)
└── index.html               (Entry template)
```

## Routes

```typescript
// app/App.tsx
<ErrorBoundary>
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/register"      element={<RegisterPage />} />
        <Route path="/"              element={<ProtectedRoute><TaskPage /></ProtectedRoute>} />
        <Route path="/tasks/:jiraId" element={<ProtectedRoute><TaskDetailPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
</ErrorBoundary>
```

## API Layer

### Types (`shared/types/task.ts`)

```typescript
export type TaskState =
  | 'NotStarted' | 'InDev' | 'MrToRelease'
  | 'InTest' | 'MrToMaster' | 'Completed';

export interface Task {
  id: number;
  jiraId: string;
  state: TaskState;
  userId: number;
}

export interface TaskDetail {
  jiraId: string;
  state: TaskState;
  projects: Project[];
  mergeRequests: MergeRequest[];
}

export interface MoveTaskResult {
  state: TaskState;
  projects: Project[];
}
```

### Validation Schemas (`shared/api/schemas.ts`)

All API responses are validated with **Zod** schemas before use:
- `authResponseSchema` — register/login responses
- `taskSchema`, `taskListSchema` — task list/create
- `taskDetailSchema` — task detail endpoint
- `moveTaskResultSchema` — move task response

### HTTP Client (`shared/api/httpClient.ts`)

```typescript
// Base URL from VITE_API_BASE_URL env var (required in production)
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

// Auto-injects Bearer token from localStorage
export function authHeaders(): Record<string, string>

// Handles 401 → clears auth + redirect to /login
export async function handleResponse<T>(response: Response): Promise<T>
```

### Tasks API (`shared/api/tasksApi.ts`)

| Function | Endpoint | Method | Returns |
|----------|----------|--------|---------|
| `fetchTasks()` | `/api/tasks` | GET | `Promise<Task[]>` |
| `fetchTaskDetail(jiraId)` | `/api/tasks/:jiraId` | GET | `Promise<TaskDetail>` |
| `createTask(payload)` | `/api/tasks` | POST | `Promise<Task>` |
| `moveTask(jiraId)` | `/api/tasks/:jiraId/move` | POST | `Promise<MoveTaskResult>` |

All responses are parsed through Zod schemas (throws on shape mismatch).

---

## Pages

### TaskPage (`features/tasks/TaskPage.tsx`)

Task list with create form and state filter.

**State:** `tasks[]`, `loading`, `error`, `newJiraId`, `filter`

**Actions:**
- Load tasks on mount (`fetchTasks`)
- Create task via form submit (`createTask`) → prepend to list
- Filter by `TaskState` (memoized)
- Click task → navigate to `/tasks/:jiraId`

### TaskDetailPage (`features/tasks/TaskDetailPage.tsx`)

Detail view for a single task (route param `:jiraId`).

**State:** managed by `useTaskDetail` hook

**Shows:**
- Task state (with stepper spanning full width)
- Associated projects list
- Merge requests list
- "Move to next state" button (calls `moveTask`)

### LoginPage / RegisterPage (`features/auth/`)

Standard auth forms. On success: call `context.login(state)` → redirect to `/`.

---

## Custom Hook: `useTaskDetail`

**File:** `shared/hooks/useTaskDetail.ts`

Encapsulates fetch + move for the detail page:
- `fetchTaskDetail(jiraId)` on mount
- `moveTask(jiraId)` on user action
- Returns `{ detail, loading, error, move }`

---

## Authentication

### `shared/auth/auth.ts`

```typescript
export type UserRole = 'Developer' | 'Manager';

export interface AuthState {
  token: string;
  userId: number;
  email: string;
  role: UserRole;
}

// Stored in localStorage under key 'mrhelper_auth'
// TODO: rename key after project rename
// TODO: migrate to HttpOnly cookies to mitigate XSS token exfiltration
export function getAuth(): AuthState | null
export function getToken(): string | null
export function setAuth(state: AuthState): void
export function clearAuth(): void
```

### `features/auth/AuthContext.tsx`

Exposes `auth`, `login(state)`, `logout()`. Wraps entire app.

### `shared/components/`

| Component | Purpose |
|-----------|---------|
| `AppHeader` | Shared header with app title + logout button |
| `ConfirmDialog` | Reusable confirmation modal (used in TaskDetailPage) |
| `ErrorBoundary` | Catches React render errors, shows fallback |
| `Spinner` | Loading indicator |

---

## Build & Development

**package.json scripts:**
```json
{
  "dev":        "vite",
  "build":      "tsc -b && vite build",
  "lint":       "eslint .",
  "preview":    "vite preview",
  "test":       "vitest run",
  "test:watch": "vitest"
}
```

**Test setup:** `src/test/setup.ts` — imports `@testing-library/jest-dom` matchers for Vitest.

**TypeScript:** Strict mode, React JSX transform, ES2020 target.

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^19.2.0 | UI framework |
| react-dom | ^19.2.0 | DOM rendering |
| react-router-dom | ^7.13.2 | Client-side routing |
| zod | ^4.3.6 | Runtime schema validation |
| vite | ^7.3.1 | Build tool, dev server |
| typescript | ~5.9.3 | Type checking |
| @vitejs/plugin-react | ^5.1.1 | React HMR |
| vitest | ^4.1.2 | Unit test runner |
| @testing-library/react | ^16.3.2 | Component testing |
| @testing-library/user-event | ^14.6.1 | User interaction simulation |
| @testing-library/jest-dom | ^6.9.1 | DOM matchers |
| jsdom | ^29.0.1 | Browser environment for tests |
| eslint | ^9.39.1 | Linting |

---

## Related Codemaps

- See [architecture.md](architecture.md) for backend integration points
- See [data.md](data.md) for task state definitions