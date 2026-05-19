## Iteration 1 — MQ-002-05 (RU vocabulary: стадии + canonical stage register)

**Issue ID:** MQ-002-05
**Strategy:** pinned (two-part fix)

### Files touched (6 files, i18n + logic + tests)

- `src/common/i18n/locales/ru/gantt.json` — added `stageBarEditor.stageName.*` (5 RU short-form names); rewrote `stageBarEditor.errors.*` and `stageBarEditor.announce.error.*`: `этап` → `стадия` (all declensions), guillemets stripped from `{{neighbour}}` interpolation.
- `src/common/i18n/locales/en/gantt.json` — added `stageBarEditor.stageName.*` (5 EN entries mirroring `tracks.stage.*`).
- `resolveStageSaveErrorMessage.ts` — neighbour key lookup changed from `tracks.stage.<snake>` to `stageBarEditor.stageName.<snake>`.
- `resolveStageSaveAnnounceMessage.ts` — same key-path change.
- `resolveStageSaveErrorMessage.test.ts` — updated test description + assertion to `stageBarEditor.stageName.stand_testing`.
- `resolveStageSaveAnnounceMessage.test.ts` — same.

### Closure check

- `npm test -- --run`: 698 tests passed (exit 0).
- `npm run build`: tsc + vite clean (exit 0); pre-existing chunk-size warning unchanged.

### No deviations

Fix follows the pinned spec exactly: option (a) — new `stageBarEditor.stageName` namespace, `tracks.stage.*` untouched.
