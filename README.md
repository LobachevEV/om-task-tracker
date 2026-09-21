# OneMoreTaskTracker

Трекер задач и релизных планов для команды, которая живёт в GitLab: планирование фич на Gantt-таймлайне,
жизненный цикл задач от `NOT_STARTED` до `COMPLETED` и операции над merge request'ами прямо из интерфейса.

Система собрана как набор микросервисов на .NET 10 с gRPC между ними, REST-шлюзом наружу и SPA на React 19.

---

## Архитектура

```
Browser ──REST/JWT──► OneMoreTaskTracker.Api ──gRPC──► Users
   (SPA)                   (gateway / BFF)    ├──gRPC──► Tasks ──gRPC──► GitLab.Proxy ──REST──► GitLab
                                              └──gRPC──► Features
```

Каждый сервис — отдельный bounded context со своей схемой в PostgreSQL, своим wire-контрактом и своим
циклом деплоя. Шлюз — единственное место, где данные разных контекстов склеиваются; сервисы между собой
напрямую не ходят.

| Сервис | Порт (dev) | Ответственность |
|---|---|---|
| `OneMoreTaskTracker.Api` | 5000 | REST-шлюз: выпуск и проверка JWT, авторизация по ролям, композиция ответов, маппинг gRPC-ошибок в HTTP |
| `OneMoreTaskTracker.Users` | 5103 | Пользователи, аутентификация (BCrypt, work factor 12), роли, состав команды |
| `OneMoreTaskTracker.Tasks` | 5102 | Жизненный цикл задач, сводки по исполнителям, интеграция с MR через прокси |
| `OneMoreTaskTracker.Features` | 5110 | Фичи, их стадии и плановые даты |
| `OneMoreTaskTracker.GitLab.Proxy` | 5176 | Anti-corruption layer над GitLab REST API; собственного состояния не хранит |
| `OneMoreTaskTracker.WebClient` | 5173 | React 19 SPA (Vite), Zod-валидация ответов API, i18n |

**Роли:** `Manager`, `FrontendDeveloper`, `BackendDeveloper`, `Qa`.

**Состояния задачи:** `NOT_STARTED → IN_DEV → MR_TO_RELEASE → IN_TEST → MR_TO_MASTER → COMPLETED`.

**Состояния фичи:** `CsApproving → Development → Testing → EthalonTesting → LiveRelease`.

Подробности архитектурных правил и принятых конвенций — в [CLAUDE.md](CLAUDE.md).

---

## Требования

- .NET SDK 10.0
- Node.js 20+ и npm
- PostgreSQL 16+ (или Docker — см. ниже)
- Docker + Docker Compose (для запуска всего стека одной командой)

---

## Быстрый старт: Docker Compose

Поднимает PostgreSQL, накатывает миграции всех трёх баз, стартует четыре gRPC-сервиса, шлюз и SPA под nginx.

```bash
docker compose up --build
```

| Что | Где |
|---|---|
| SPA | http://localhost:8080 |
| REST API | http://localhost:5000 |
| PostgreSQL | localhost:**5433** |

Настройки, которые стоит переопределить через переменные окружения (`.env` рядом с `compose.yaml`):

```bash
Jwt__Secret=<минимум 32 символа>
GitLab__BaseUrl=https://gitlab.example.com
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<пароль>
```

> Значение `Jwt__Secret` по умолчанию — заглушка из `appsettings.json`. В любой среде, кроме локальной,
> её обязательно нужно заменить.

---

## Запуск локально, без Docker

### 1. База данных

Нужны три базы — `Users`, `Tasks`, `Features` — на `localhost:5432` (строки подключения лежат в
`appsettings.json` каждого сервиса):

```bash
psql -U postgres -c 'CREATE DATABASE "Users"; CREATE DATABASE "Tasks"; CREATE DATABASE "Features";'
```

### 2. Миграции

Каждый сервис с БД умеет накатывать свои миграции и выходить:

```bash
dotnet run --project OneMoreTaskTracker.Users    -- --migrate
dotnet run --project OneMoreTaskTracker.Tasks    -- --migrate
dotnet run --project OneMoreTaskTracker.Features -- --migrate
```

### 3. Сервисы

Каждый — в своём терминале:

```bash
dotnet run --project OneMoreTaskTracker.Users
dotnet run --project OneMoreTaskTracker.Tasks
dotnet run --project OneMoreTaskTracker.Features
dotnet run --project OneMoreTaskTracker.GitLab.Proxy
dotnet run --project OneMoreTaskTracker.Api
```

### 4. Фронтенд

```bash
cd OneMoreTaskTracker.WebClient
npm install
npm run dev
```

Дев-сервер поднимается на http://localhost:5173 и проксирует `/api` на `http://localhost:5000`,
так что отдельная настройка базового URL не нужна.

---

## Тесты

```bash
dotnet test                                  # xUnit: юнит + интеграционные (WebApplicationFactory)

cd OneMoreTaskTracker.WebClient
npm test                                     # vitest, юнит-проект
npm run test:all                             # + storybook-проект
npm run e2e                                  # Playwright
npm run lint                                 # eslint
npm run build                                # tsc -b && vite build
```

---

## Структура репозитория

```
OneMoreTaskTracker.Api/              REST-шлюз: контроллеры, JWT, middleware
OneMoreTaskTracker.Users/            gRPC: пользователи и аутентификация
OneMoreTaskTracker.Tasks/            gRPC: задачи и их жизненный цикл
OneMoreTaskTracker.Features/         gRPC: фичи, стадии, планирование
OneMoreTaskTracker.GitLab.Proxy/     gRPC → GitLab REST
OneMoreTaskTracker.WebClient/        React 19 + TypeScript + Vite
tests/                               xUnit-проекты, по одному на сервис
infra/postgres/                      init-скрипт для контейнера с БД
compose.yaml                         весь стек в Docker
```

---

## API

REST-поверхность описана в [`OneMoreTaskTracker.Api/openapi.json`](OneMoreTaskTracker.Api/openapi.json)
(файл поддерживается вручную — при изменении эндпоинтов его нужно обновлять вместе с кодом).

Основные группы маршрутов:

| Маршрут | Назначение |
|---|---|
| `POST /api/auth/register`, `POST /api/auth/login` | регистрация и выпуск JWT |
| `GET /api/tasks`, `GET /api/tasks/{jiraId}` | список задач и карточка задачи |
| `POST /api/tasks`, `POST /api/tasks/{jiraId}/move` | создание задачи и переход по состояниям |
| `GET /api/plan/features`, `GET /api/plan/features/{id}` | список фич и одна фича с планом |
| `POST /api/plan/features`, `PATCH /api/plan/features/{id}` | создание и sparse-PATCH фичи |
| `PATCH /api/plan/features/{featureId}/tracks/{kind}` | трек фичи целиком |
| `PATCH /api/plan/features/{featureId}/tracks/{kind}/stages/{stageKey}` | отдельная стадия трека |
| `POST /api/plan/features/{id}/tasks/{jiraId}`, `DELETE …` | привязка и отвязка задач от фичи |
| `GET /api/team/members`, `POST /api/team/members`, `DELETE /api/team/members/{userId}` | состав команды |

Все маршруты, кроме `api/auth`, требуют `Authorization: Bearer <token>`.
Изменение плана и состава команды (`POST`/`PATCH`/`DELETE` в `api/plan` и `api/team`) доступно только роли `Manager`.

---

## Конвенции разработки

- Nullable reference types включены во всех проектах, implicit usings — тоже.
- Один use-case — один handler (`CreateTaskHandler`, `FindMrHandler`, `RegisterHandler`).
- Стриминговые gRPC-ответы — через `IAsyncEnumerable<T>` с `CancellationToken`.
- Валидация входных данных — FluentValidation плюс per-service gRPC-интерсептор.
- Фронтенд: функциональные компоненты, Zod на границе API, React Context для авторизации,
  `ErrorBoundary` в корне приложения.
