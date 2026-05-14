import { defineConfig, devices } from '@playwright/test';

process.env.ALUMNIUM_MODEL ??= 'ollama/qwen3:14b';
// alumnium's ALUMNIUM_OLLAMA_URL is z.httpUrl(), which rejects both `localhost`
// and bare IPs (its regex requires a letter-only TLD). Use OLLAMA_HOST instead —
// it's z.string() with no URL regex, and alumnium consults it first
// (Env.OLLAMA_HOST || Env.ALUMNIUM_OLLAMA_URL).
process.env.OLLAMA_HOST ??= 'http://127.0.0.1:11434';

const PORT = Number(process.env.E2E_PORT ?? 5173);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
const CI = !!process.env.CI;

const useExternalServer = process.env.E2E_EXTERNAL_SERVER === '1';

export default defineConfig({
  testDir: './e2e/specs-ai',
  fullyParallel: false,
  workers: 1,
  forbidOnly: CI,
  retries: 0,
  reporter: [
    ['html', { outputFolder: 'playwright-report-ai', open: 'never' }],
    ['list'],
  ],
  // LLM round-trips dominate runtime — qwen3:14b plus DOM serialization can
  // push a single al.do()/al.check() past a minute on first call.
  timeout: 180_000,
  expect: { timeout: 30_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30_000,
    navigationTimeout: 30_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: useExternalServer
    ? undefined
    : {
        command: `npm run dev -- --port ${PORT} --strictPort`,
        url: BASE_URL,
        reuseExistingServer: !CI,
        timeout: 60_000,
        stdout: 'ignore',
        stderr: 'pipe',
      },
  outputDir: 'test-results-ai',
});
