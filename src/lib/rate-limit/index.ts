import 'server-only';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { AppError } from '@/lib/server';
const memory = new Map<string, { count: number; reset: number }>();
let shared: Ratelimit | undefined;
let daily: Ratelimit | undefined;
export async function throttle(request: NextRequest, identity: string, paid = false) {
  const configured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  if (paid && process.env.NODE_ENV === 'production' && !configured)
    throw new AppError(
      'RATE_LIMIT_CONFIG',
      'AI xizmati hali ommaviy foydalanish uchun sozlanmagan.',
      503,
    );
  // x-vercel-forwarded-for is meaningful only on Vercel; never trust arbitrary x-forwarded-for.
  const ip = process.env.VERCEL
    ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    : 'local';
  const keys = [
    createHash('sha256').update(identity).digest('hex'),
    'ip:' + createHash('sha256').update(ip).digest('hex'),
  ];
  if (configured) {
    const redis = Redis.fromEnv();
    shared ??= new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '1 m'),
      prefix: 'dava:minute',
      timeout: 3000,
    });
    // The independent session/IP checks can share one network-wait phase.
    // Keep the daily budget after both approvals: minute-blocked requests must
    // not drain the global AI allowance without ever reaching a provider.
    const minuteResults = await Promise.allSettled(keys.map((key) => shared!.limit(key)));
    if (minuteResults.some((result) => result.status === 'rejected'))
      throw new AppError(
        'RATE_LIMIT_UNAVAILABLE',
        'So‘rovlar himoyasi vaqtincha mavjud emas. Keyinroq urinib ko‘ring.',
        503,
      );
    if (
      minuteResults.some(
        (result) =>
          result.status === 'fulfilled' &&
          (!result.value.success || result.value.reason === 'timeout'),
      )
    )
      throw new AppError('RATE_LIMIT', 'So‘rovlar ko‘payib ketdi. Bir daqiqa kuting.', 429);
    if (paid) {
      const configuredLimit = Number(process.env.AI_DAILY_LIMIT || 500);
      const limit =
        Number.isInteger(configuredLimit) && configuredLimit > 0 ? configuredLimit : 500;
      daily ??= new Ratelimit({
        redis,
        limiter: Ratelimit.fixedWindow(limit, '1 d'),
        prefix: 'dava:budget',
        timeout: 3000,
      });
      const result = await daily.limit('all-guests').catch(() => {
        throw new AppError(
          'RATE_LIMIT_UNAVAILABLE',
          'So‘rovlar himoyasi vaqtincha mavjud emas. Keyinroq urinib ko‘ring.',
          503,
        );
      });
      if (!result.success || result.reason === 'timeout')
        throw new AppError('DAILY_LIMIT', 'Bugungi AI limiti tugadi. Keyinroq qayting.', 429);
    }
  } else {
    const now = Date.now();
    for (const [key, value] of memory) if (value.reset < now) memory.delete(key);
    for (const key of keys) {
      const bucket = memory.get(key) || { count: 0, reset: now + 60000 };
      bucket.count++;
      memory.set(key, bucket);
      if (bucket.count > 30)
        throw new AppError('RATE_LIMIT', 'Bir daqiqa kutib, qayta urinib ko‘ring.', 429);
    }
  }
}
