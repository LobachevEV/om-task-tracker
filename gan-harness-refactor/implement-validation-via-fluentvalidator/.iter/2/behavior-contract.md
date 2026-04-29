# Behavior Contract

Track: backend
Label: iter-2
Captured-at: 2026-04-29T09:13:38.079Z
Frozen: true
Machine companion: ./behavior-contract.json

Authoritative discovery rules: `GAN-FEATURE-SHARED.md` §"Behavior contract discovery (canonical)".

## Captured surfaces

| id | kind | tolerance | capture command |
|----|------|-----------|-----------------|
| openapi | json | exact | `cat OneMoreTaskTracker.Api/openapi.json` |
| proto_features | text | exact | `cd OneMoreTaskTracker.Features/Protos && for f in $(find . -name '*.proto' -type f | LC_ALL=C sort); do printf '=== %s ===\n' "$f"; cat "$f"; printf '\n'; done` |
| proto_tasks | text | exact | `cd OneMoreTaskTracker.Tasks/Protos && for f in $(find . -name '*.proto' -type f -not -path './Clients/*' | LC_ALL=C sort); do printf '=== %s ===\n' "$f"; cat "$f"; printf '\n'; done` |
| proto_users | text | exact | `cd OneMoreTaskTracker.Users/Protos && for f in $(find . -name '*.proto' -type f | LC_ALL=C sort); do printf '=== %s ===\n' "$f"; cat "$f"; printf '\n'; done` |
| rpc_error_surface_users | text | exact | `grep -REn 'throw new RpcException\(new Status\(StatusCode\.[A-Za-z]+,' OneMoreTaskTracker.Users --include='*.cs' | grep -v '/bin/' | grep -v '/obj/' | LC_ALL=C sort` |
| rpc_error_surface_tasks | text | exact | `grep -REn 'throw new RpcException\(new Status\(StatusCode\.[A-Za-z]+,' OneMoreTaskTracker.Tasks --include='*.cs' | grep -v '/bin/' | grep -v '/obj/' | LC_ALL=C sort` |
| rpc_error_surface_features | text | exact | `grep -REn 'throw new RpcException\(new Status\(StatusCode\.[A-Za-z]+,' OneMoreTaskTracker.Features --include='*.cs' | grep -v '/bin/' | grep -v '/obj/' | LC_ALL=C sort` |
| db_migrations_features | text | exact | `ls OneMoreTaskTracker.Features/Migrations | LC_ALL=C sort | grep -E '^[0-9]+_.+\.cs$' | grep -v Designer` |
| db_migrations_tasks | text | exact | `ls OneMoreTaskTracker.Tasks/Migrations | LC_ALL=C sort | grep -E '^[0-9]+_.+\.cs$' | grep -v Designer` |
| db_migrations_users | text | exact | `ls OneMoreTaskTracker.Users/Migrations | LC_ALL=C sort | grep -E '^[0-9]+_.+\.cs$' | grep -v Designer` |
| endpoint_matrix_api | text | exact | `grep -REn '^\s*\[(HttpPatch|HttpGet|HttpPost|HttpDelete|Authorize|Route|ApiController)\(' OneMoreTaskTracker.Api/Controllers --include='*.cs' | LC_ALL=C sort` |
| validation_test_assertions | text | exact | `grep -REn 'StatusCode\s*==\s*StatusCode\.|StatusCode\.Should\(\)|\.Status\.Detail|RpcException' tests --include='*.cs' | grep -v '/bin/' | grep -v '/obj/' | LC_ALL=C sort` |
