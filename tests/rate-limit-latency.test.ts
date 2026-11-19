// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { minute, budget, redisFromEnv } = vi.hoisted(() => ({
  minute: vi.fn(),
  budget: vi.fn(),
  redisFromEnv: vi.fn(() => ({})),
}));
vi.mock('@upstash/redis', () => ({ Redis: { fromEnv: redisFromEnv } }));
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class {
    static slidingWindow = vi.fn(() => 'minute-policy');
    static fixedWindow = vi.fn(() => 'daily-policy');
    limit: typeof minute;
    constructor(options: { prefix: string }) {
      this.limit = options.prefix === 'dava:budget' ? budget : minute;
    }
  },
}));

function gate<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
const request = () =>
  new NextRequest('https://dava.example/api/translate', {
    headers: { 'x-vercel-forwarded-for': '192.0.2.10' },
  });
beforeEach(() => {
  vi.resetModules();
  minute.mockReset().mockResolvedValue({ success: true });
  budget.mockReset().mockResolvedValue({ success: true });
  redisFromEnv.mockClear();
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('VERCEL', '1');
  vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://test.example');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'private-test-only');
});
afterEach(() => vi.unstubAllEnvs());

it('overlaps minute checks while keeping the daily budget behind both approvals', async () => {
  const session = gate<{ success: boolean }>(),
    ip = gate<{ success: boolean }>();
  minute.mockReturnValueOnce(session.promise).mockReturnValueOnce(ip.promise);
  const { throttle } = await import('@/lib/rate-limit');
  const pending = throttle(request(), 'guest-a', true);
  // Neither remote result exists yet, but both independent checks have started.
  expect(minute).toHaveBeenCalledTimes(2);
  expect(budget).not.toHaveBeenCalled();
  session.resolve({ success: true });
  await Promise.resolve();
  expect(budget).not.toHaveBeenCalled();
  ip.resolve({ success: true });
  await pending;
  expect(budget).toHaveBeenCalledExactlyOnceWith('all-guests');
});

it.each([
  { result: { success: false }, scenario: 'minute denial' },
  { result: { success: true, reason: 'timeout' }, scenario: 'fail-open Upstash timeout result' },
])('does not consume daily quota after $scenario', async ({ result }) => {
  minute.mockResolvedValueOnce(result);
  const { throttle } = await import('@/lib/rate-limit');
  await expect(throttle(request(), 'guest-a', true)).rejects.toMatchObject({
    code: 'RATE_LIMIT',
    status: 429,
  });
  expect(budget).not.toHaveBeenCalled();
});

it('fails closed and hides Redis exception details when either minute check rejects', async () => {
  minute.mockRejectedValueOnce(new Error('private-test-only network detail'));
  const { throttle } = await import('@/lib/rate-limit');
  await expect(throttle(request(), 'guest-a', true)).rejects.toMatchObject({
    code: 'RATE_LIMIT_UNAVAILABLE',
    status: 503,
  });
  expect(budget).not.toHaveBeenCalled();
});

it.each([{ success: false }, { success: true, reason: 'timeout' }])(
  'fails closed on daily quota denial or timeout: %s',
  async (result) => {
    budget.mockResolvedValueOnce(result);
    const { throttle } = await import('@/lib/rate-limit');
    await expect(throttle(request(), 'guest-a', true)).rejects.toMatchObject({
      code: 'DAILY_LIMIT',
      status: 429,
    });
  },
);

it('fails closed if the daily Redis operation rejects', async () => {
  budget.mockRejectedValueOnce(new Error('private-test-only network detail'));
  const { throttle } = await import('@/lib/rate-limit');
  await expect(throttle(request(), 'guest-a', true)).rejects.toMatchObject({
    code: 'RATE_LIMIT_UNAVAILABLE',
    status: 503,
  });
});

it('keeps unpaid requests out of the daily AI budget', async () => {
  const { throttle } = await import('@/lib/rate-limit');
  await throttle(request(), 'guest-a');
  expect(minute).toHaveBeenCalledTimes(2);
  expect(budget).not.toHaveBeenCalled();
});

it('retains the production fail-closed default when shared limiting is missing', async () => {
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
  const { throttle } = await import('@/lib/rate-limit');
  await expect(throttle(request(), 'guest-a', true)).rejects.toMatchObject({
    code: 'RATE_LIMIT_CONFIG',
    status: 503,
  });
  expect(minute).not.toHaveBeenCalled();
  expect(budget).not.toHaveBeenCalled();
});
