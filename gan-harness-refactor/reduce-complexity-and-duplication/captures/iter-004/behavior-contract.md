# Behavior Contract

Track: backend
Label: iter-004
Captured-at: 2026-04-29T14:24:42.709Z
Frozen: true
Machine companion: ./behavior-contract.json

Authoritative discovery rules: `GAN-FEATURE-SHARED.md` §"Behavior contract discovery (canonical)".

## Captured surfaces

| id | kind | tolerance | capture command |
|----|------|-----------|-----------------|
| openapi_json | json | exact | `cat OneMoreTaskTracker.Api/openapi.json` |
| features_proto_surface | text | exact | `find OneMoreTaskTracker.Features/Protos -type f -name '*.proto' | sort | xargs -I {} sh -c 'echo "# FILE: {}"; cat "{}"'` |
| ef_migrations_history | text | exact | `ls -1 OneMoreTaskTracker.Features/Migrations/ | grep -Ev 'Designer|Snapshot' | sort` |
| ef_schema_columns | text | exact | `grep -hn 'table\.Column' OneMoreTaskTracker.Features/Migrations/*.cs | sort` |
| feature_entity_shape | text | exact | `for f in OneMoreTaskTracker.Features/Features/Data/Feature.cs OneMoreTaskTracker.Features/Features/Data/FeatureStagePlan.cs OneMoreTaskTracker.Features/Features/Data/FeatureState.cs; do echo "# FILE: $f"; grep -nE '^(\s*)(public|internal|private|protected)?\s*(partial\s+)?(class|record|enum|interface)\s|public\s+[^()]+\s+[A-Za-z_][A-Za-z0-9_]*\s*\{\s*(get|set|init|private)' "$f" | sed -E 's/(\})[[:space:]]*=[[:space:]]*[^;]+;/\1/' || true; done` |
| api_endpoint_matrix | text | exact | `grep -rEn '^\s*\[(HttpGet|HttpPost|HttpPut|HttpPatch|HttpDelete|Route|Authorize|AllowAnonymous|ApiController)' OneMoreTaskTracker.Api/Controllers --include='*.cs' | sort` |
| grpc_status_code_emit_sites | text | exact | `grep -rEn 'new RpcException\(new Status\(StatusCode\.[A-Za-z]+' OneMoreTaskTracker.Features/Features --include='*.cs' | sed -E 's/^([^:]+):([0-9]+):.*StatusCode\.([A-Za-z]+).*/\1 :: \3/' | sort | uniq -c | sort -k2` |
| feature_inline_edit_log_format | text | exact | `grep -hEn 'Feature inline edit applied' OneMoreTaskTracker.Features/Features/Update/*.cs | sed -E 's/[[:space:]]+/ /g' | sort` |
| test_corpus_assertion_count | text | exact | `grep -rEn '\b(Should|Be|Equal|Contain|Throw|NotBeNull|BeNull|HaveCount|BeEquivalentTo|Match)\(' tests --include='*.cs' | wc -l | tr -d ' '` |
