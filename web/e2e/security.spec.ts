import { test, expect } from '@playwright/test';

test('HTML has enforcing security headers and a fresh script nonce', async ({ request }) => {
  const first = await request.get('/');
  const second = await request.get('/');
  expect(first.headers()['x-frame-options']).toBe('DENY');
  expect(first.headers()['x-content-type-options']).toBe('nosniff');
  expect(first.headers()['x-powered-by']).toBeUndefined();
  const csp = first.headers()['content-security-policy'];
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).not.toContain("'unsafe-eval'");
  const nonce = csp.match(/'nonce-([^']+)'/)?.[1];
  expect(nonce).toBeTruthy();
  expect(await first.text()).toContain(`nonce="${nonce}"`);
  expect(second.headers()['content-security-policy']).not.toBe(csp);
});
