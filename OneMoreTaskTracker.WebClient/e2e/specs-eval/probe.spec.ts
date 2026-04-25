import { test } from '../fixtures/authed';

test('probe /plan network', async ({ managerPage: page }) => {
  page.on('request', r => {
    if (r.url().includes('/api/')) console.log('REQ ' + r.method() + ' ' + r.url());
  });
  page.on('response', async r => {
    if (r.url().includes('/api/')) {
      const ct = r.headers()['content-type'] ?? '';
      let body = '';
      try { body = (await r.text()).substring(0, 600); } catch { /* body read failed — non-fatal for probe */ }
      console.log('RES ' + r.status() + ' ' + r.url() + ' ct=' + ct + '\n    BODY: ' + body);
    }
  });
  await page.goto('/plan');
  await page.waitForTimeout(2500);
});
