import { Alumni, Model } from 'alumnium';
import { test, expect } from '../fixtures/authed';
import { isBackendReachable } from '../helpers/backend';
import { ALUMNIUM_MODEL, EXCLUDE_ATTRIBUTES, isOllamaReachable, OLLAMA_URL } from '../helpers/llm';

test.describe('@ai plan view — Alumnium + Ollama (qwen3:14b)', () => {
  test.beforeAll(async () => {
    test.skip(
      !(await isBackendReachable()),
      'gateway at :5000 unreachable — skipping AI specs',
    );
    test.skip(
      !(await isOllamaReachable()),
      `Ollama at ${OLLAMA_URL} with model ${ALUMNIUM_MODEL} not reachable — skipping AI specs`,
    );
  });

  test('verifies plan toolbar via natural-language assertion', async ({ managerPage }) => {
    const al = new Alumni(managerPage, {
      model: Model.parse(ALUMNIUM_MODEL),
      excludeAttributes: [...EXCLUDE_ATTRIBUTES],
    });

    try {
      await managerPage.goto('/plan');
      await expect(managerPage).toHaveURL(/\/plan$/);

      await al.check('the page is on the plan view and is not empty');
      await al.check('the page contains a control labelled "New feature"');
    } finally {
      await al.cache.discard();
      await al.quit();
    }
  });
});
