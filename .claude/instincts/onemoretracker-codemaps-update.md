---
id: onemoretracker-codemaps-update
trigger: "when completing a feature that changes architecture, adds a service, or modifies data models"
confidence: 0.85
domain: documentation
source: local-repo-analysis
---

# Update docs/CODEMAPS/ After Architecture Changes

## Action
After any change that affects the system's shape — new service, new entity,
new gRPC endpoint, new API route — update the relevant CODEMAPS files:

- `docs/CODEMAPS/architecture.md` — service topology, port assignments
- `docs/CODEMAPS/backend.md` — handler list, DB schema, gRPC service inventory
- `docs/CODEMAPS/data.md` — entity models, state machine diagram
- `docs/CODEMAPS/frontend.md` — pages, components, API calls
- `docs/CODEMAPS/dependencies.md` — package/library additions
- `docs/CODEMAPS/INDEX.md` — if a new CODEMAPS file is added

Commit type: `docs:`.

## Evidence
- 3 of the recent commits are `docs: update codemaps` commits
- CLAUDE.md explicitly says: "Start with docs/ — read the relevant files to understand
  the domain" and "docs/ is the source of truth"
- Co-change: architecture/backend CODEMAPS always updated after feat commits

## How to apply
Before closing any feature branch, scan which CODEMAPS files are stale and update them.
Use `/update-codemaps` skill if available, otherwise edit directly.
