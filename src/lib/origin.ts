import type { NextRequest } from 'next/server';

function configuredOrigin(value?: string) {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

export function allowedOrigins(request: NextRequest) {
  const allowed = new Set<string>();
  const configured = configuredOrigin(process.env.APP_ORIGIN);
  if (configured) allowed.add(configured);
  // Only deployment metadata supplied by this project's Vercel runtime is trusted.
  // Do not trust Origin, Host, forwarded headers, or a wildcard *.vercel.app allowlist.
  if (process.env.VERCEL === '1') {
    for (const value of [
      process.env.VERCEL_URL,
      process.env.VERCEL_BRANCH_URL,
      process.env.VERCEL_PROJECT_PRODUCTION_URL,
    ]) {
      const host = value?.trim().toLowerCase();
      if (host && /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(host) && host.includes('.')) {
        const origin = configuredOrigin(`https://${host}`);
        if (origin) allowed.add(origin);
      }
    }
  }
  // Preserve ordinary self-hosted / local behavior when no canonical origin is configured.
  if (!process.env.APP_ORIGIN?.trim() && allowed.size === 0) allowed.add(request.nextUrl.origin);
  return allowed;
}

export function isAllowedMutation(request: NextRequest) {
  if (['GET', 'HEAD'].includes(request.method)) return true;
  const origin = request.headers.get('origin');
  if (!origin || request.headers.get('sec-fetch-site') === 'cross-site') return false;
  const normalized = configuredOrigin(origin);
  // Browser Origin values are serialized origins, not URLs with paths or credentials.
  if (!normalized || normalized !== origin) return false;
  return allowedOrigins(request).has(origin);
}
