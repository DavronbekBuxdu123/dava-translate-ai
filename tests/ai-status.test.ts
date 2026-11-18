// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/ai/status/route';
afterEach(() => vi.unstubAllEnvs());
it('never exposes diagnostic configuration in production', async () => {
  vi.stubEnv('NODE_ENV', 'production');
  expect((await GET()).status).toBe(404);
});
it('reports configured versus untested without revealing keys or DB passwords', async () => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('GEMINI_API_KEY', 'secret-key-do-not-print');
  vi.stubEnv('DATABASE_URL', 'postgresql://user:private-password@host/db');
  vi.stubEnv('TRANSLATION_PROVIDER', 'gemini');
  const response = await GET();
  const text = await response.text();
  expect(response.status).toBe(200);
  expect(text).not.toContain('secret-key-do-not-print');
  expect(text).not.toContain('private-password');
  const { data } = JSON.parse(text);
  expect(data.translation).toMatchObject({ provider: 'gemini', keyConfigured: true });
  expect(data.note).toContain('tasdiqlamaydi');
});
