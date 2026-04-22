# CODEMAPS

A **CODEMAP** is a one-page, hand-curated map of a bounded context or frontend module. It links load-bearing filenames to behaviors so a newcomer can navigate a service or page in minutes without spelunking the whole tree.

CODEMAPS are **supplements to the auto-generated `graphify-out/wiki/`** — not replacements. The wiki covers every node; a CODEMAP covers only the files that matter for a first read. When the two disagree, trust the source code, then fix the CODEMAP.

Scope: one CODEMAP per bounded context or per first-class frontend feature. Keep each map roughly 60–120 lines. Use project-relative paths so the graphify extractor can pick up the references.

## Index

- [api-gateway.md](./api-gateway.md) — `OneMoreTaskTracker.Api` (REST gateway, JWT, composition).
- [features-service.md](./features-service.md) — `OneMoreTaskTracker.Features` (feature aggregate, lifecycle).
- [tasks-service.md](./tasks-service.md) — `OneMoreTaskTracker.Tasks` (task lifecycle, feature FK).
- [plan-frontend.md](./plan-frontend.md) — `src/features/gantt/*` (Gantt plan page, drawer, timeline).
