// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { AppError, failure, readJson, sameOrigin } from '@/lib/server';
import { translationSchema } from '@/lib/validation';
vi.mock('@/lib/db', () => ({ db: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: vi.fn() }));
import { assertOwner, guest } from '@/lib/auth/guest';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { ai } from '@/lib/ai/client';
import { throttle } from '@/lib/rate-limit';
describe('guest authorization', () => {
  it('accepts only the owning guest and conceals foreign IDs', () => {
    expect(() => assertOwner('guest-a', 'guest-a')).not.toThrow();
    expect(() => assertOwner('guest-a', 'guest-b')).toThrow(AppError);
    expect(() => assertOwner('guest-a', undefined)).toThrow('Yozuv topilmadi.');
  });
  it('creates a random HttpOnly cookie and stores its hash instead of the token', async () => {
    const set = vi.fn();
    vi.mocked(cookies).mockResolvedValue({ get: () => undefined, set } as unknown as Awaited<
      ReturnType<typeof cookies>
    >);
    const upsert = vi.fn().mockResolvedValue({ id: 'owner' });
    vi.mocked(db).mockReturnValue({ guestSession: { upsert } } as unknown as ReturnType<typeof db>);
    await guest();
    expect(set).toHaveBeenCalledWith(
      'dava_guest',
      expect.stringMatching(/^[a-f0-9]{64}$/),
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' }),
    );
    expect(upsert.mock.calls[0][0].where.tokenHash).not.toEqual(set.mock.calls[0][1]);
  });
});
describe('request boundaries', () => {
  it('rejects cross-site or missing origins on mutation', () => {
    for (const origin of ['https://evil.example', undefined]) {
      const request = new NextRequest('https://dava.example/api/translate', {
        method: 'POST',
        headers: origin ? { origin } : {},
      });
      expect(() => sameOrigin(request)).toThrow(AppError);
    }
  });
  it('allows same-origin mutation', () => {
    expect(() =>
      sameOrigin(
        new NextRequest('https://dava.example/api/translate', {
          method: 'POST',
          headers: { origin: 'https://dava.example' },
        }),
      ),
    ).not.toThrow();
  });
  it('rejects malformed JSON and oversized streams', async () => {
    const make = (body: string) =>
      new NextRequest('http://localhost/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
    await expect(readJson(make('{broken'), translationSchema)).rejects.toThrow('JSON');
    await expect(readJson(make('a'.repeat(40001)), translationSchema)).rejects.toThrow('hajmi');
  });
  it('does not leak underlying errors', async () => {
    const response = failure(new Error('secret credential'));
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain('secret');
  });
  it('reports missing OpenAI configuration', () => {
    const old = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    expect(() => ai()).toThrow('OPENAI_API_KEY');
    if (old) process.env.OPENAI_API_KEY = old;
  });
  it('fails closed for production paid endpoints without shared throttling', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
    await expect(throttle(new NextRequest('http://localhost'), 'a', true)).rejects.toMatchObject({
      code: 'RATE_LIMIT_CONFIG',
      status: 503,
    });
    vi.unstubAllEnvs();
  });
});

it('uses a read for an established guest instead of rewriting it on every AI call', async () => {
  const token = 'a'.repeat(64);
  const set = vi.fn();
  vi.mocked(cookies).mockResolvedValue({ get: () => ({ value: token }), set } as unknown as Awaited<
    ReturnType<typeof cookies>
  >);
  const findUnique = vi.fn(async () => ({ id: 'existing-owner' })),
    upsert = vi.fn();
  vi.mocked(db).mockReturnValue({ guestSession: { findUnique, upsert } } as unknown as ReturnType<
    typeof db
  >);
  await expect(guest()).resolves.toEqual({ id: 'existing-owner' });
  expect(upsert).not.toHaveBeenCalled();
  expect(set).not.toHaveBeenCalled();
});
