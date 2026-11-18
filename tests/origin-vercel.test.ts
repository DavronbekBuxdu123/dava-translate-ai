// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { sameOrigin } from '@/lib/server';
const domain = 'https://dava-translate-ai-vmh9.vercel.app';
function request(origin: string | null, headers: Record<string, string> = {}) {
  return new NextRequest(`${domain}/api/translate`, {
    method: 'POST',
    headers: { ...(origin ? { origin } : {}), ...headers },
  });
}
beforeEach(() => {
  vi.stubEnv('VERCEL', '1');
  vi.stubEnv('APP_ORIGIN', 'http://localhost:3000');
  vi.stubEnv('VERCEL_URL', 'dava-translate-ai-build123-davron.vercel.app');
  vi.stubEnv('VERCEL_BRANCH_URL', 'dava-translate-ai-git-main-davron.vercel.app');
  vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'dava-translate-ai-vmh9.vercel.app');
});
afterEach(() => vi.unstubAllEnvs());
it('accepts the project production alias even with a stale localhost canonical setting', () => {
  expect(() => sameOrigin(request(domain, { 'sec-fetch-site': 'same-origin' }))).not.toThrow();
});
it.each([
  'https://dava-translate-ai-build123-davron.vercel.app',
  'https://dava-translate-ai-git-main-davron.vercel.app',
])('accepts the exact runtime deployment/branch alias %s', (origin) => {
  expect(() => sameOrigin(request(origin))).not.toThrow();
});
it.each([
  'https://attacker.vercel.app',
  'https://dava-translate-ai-ymh9.vercel.app',
  'https://dava-translate-ai-vmh9.vercel.app.evil.test',
  'http://dava-translate-ai-vmh9.vercel.app',
  'null',
  domain + '/path',
  domain + '/',
])('rejects an untrusted or malformed origin %s', (origin) => {
  expect(() => sameOrigin(request(origin))).toThrow();
});
it('continues to reject missing origins and cross-site fetches', () => {
  expect(() => sameOrigin(request(null))).toThrow();
  expect(() => sameOrigin(request(domain, { 'sec-fetch-site': 'cross-site' }))).toThrow();
});
it('does not trust spoofed forwarded headers to permit an attacker', () => {
  expect(() =>
    sameOrigin(
      request('https://attacker.test', {
        host: 'attacker.test',
        'x-forwarded-host': 'attacker.test',
        'x-forwarded-proto': 'https',
      }),
    ),
  ).toThrow();
});
it('ignores Vercel alias variables outside the Vercel runtime', () => {
  vi.stubEnv('VERCEL', '');
  expect(() => sameOrigin(request(domain))).toThrow();
});
it('supports canonical custom domains and trims environment whitespace', () => {
  vi.stubEnv('APP_ORIGIN', '  https://dava.example.com  ');
  expect(() => sameOrigin(request('https://dava.example.com'))).not.toThrow();
});
it('does not throw URL parsing exceptions if canonical configuration is malformed', () => {
  vi.stubEnv('APP_ORIGIN', '"https://bad.example"');
  expect(() => sameOrigin(request(domain))).not.toThrow();
  expect(() => sameOrigin(request('https://attacker.test'))).toThrow();
});
