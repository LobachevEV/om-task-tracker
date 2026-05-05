# Behavior Contract

Track: backend
Label: iter-3
Captured-at: 2026-04-29T12:19:21.254Z
Frozen: true
Machine companion: ./behavior-contract.json

Authoritative discovery rules: `GAN-FEATURE-SHARED.md` §"Behavior contract discovery (canonical)".

## Captured surfaces

| id | kind | tolerance | capture command |
|----|------|-----------|-----------------|
| openapi_json | json | exact | `cat OneMoreTaskTracker.Api/openapi.json` |
| features_proto_surface | text | exact | `find OneMoreTaskTracker.Features/Protos -type f -name '*.proto' | sort | xargs -I {} sh -c 'echo "# FILE: {}"; cat "{}"'` |
| feature_entity_shape | text | exact | `for f in OneMoreTaskTracker.Features/Features/Data/Feature.cs OneMoreTaskTracker.Features/Features/Data/FeatureStagePlan.cs OneMoreTaskTracker.Features/Features/Data/FeatureState.cs OneMoreTaskTracker.Features/Features/Data/FeatureStage.cs; do echo "# FILE: $f"; grep -nE '^(\s*)(public|internal|private|protected)?\s*(partial\s+)?(class|record|enum|interface)\s|public\s+[^()]+\s+[A-Za-z_][A-Za-z0-9_]*\s*\{\s*(get|set|init|private)' "$f" | sed -E 's/(\})[[:space:]]*=[[:space:]]*[^;]+;/\1/' || true; done` |
| ef_migrations_history | text | exact | `ls -1 OneMoreTaskTracker.Features/Migrations/ | grep -Ev 'Designer|Snapshot' | sort` |
| ef_schema_columns | text | exact | `grep -n 'table\.Column' OneMoreTaskTracker.Features/Migrations/20260422084830_InitialCreate.cs OneMoreTaskTracker.Features/Migrations/20260423104631_AddFeatureStagePlans.cs OneMoreTaskTracker.Features/Migrations/20260424120000_AddFeatureAndStageVersion.cs | sort` |
| api_endpoint_matrix | text | exact | `grep -rEn '^\s*\[(HttpGet|HttpPost|HttpPut|HttpPatch|HttpDelete|Route|Authorize|AllowAnonymous|ApiController)' OneMoreTaskTracker.Api/Controllers --include='*.cs' | sort` |
| jwt_claims_and_expiration_shape | text | exact | `for f in OneMoreTaskTracker.Api/Auth/JwtTokenService.cs OneMoreTaskTracker.Api/Auth/JwtOptions.cs; do echo "# FILE: $f"; grep -nE 'expires|new Claim|JwtRegisteredClaimNames|ExpirationMinutes|Audience|Issuer|SymmetricSecurityKey|HmacSha256|SigningCredentials' "$f" || true; done; echo "# FILE: OneMoreTaskTracker.Api/Program.cs (line-numbers stripped — file legitimately churns for unrelated DI; JWT block content remains exact-byte parity)"; grep -E 'expires|new Claim|JwtRegisteredClaimNames|ExpirationMinutes|Audience|Issuer|SymmetricSecurityKey|HmacSha256|SigningCredentials' OneMoreTaskTracker.Api/Program.cs || true` |
| test_corpus_assertion_count | text | exact | `grep -rEn '\b(Should|Be|Equal|Contain|Throw|NotBeNull|BeNull|HaveCount|BeEquivalentTo|Match)\(' tests --include='*.cs' | wc -l | tr -d ' '` |
