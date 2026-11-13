import type { ApiResponse } from '@/types';
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      ...(init.body && typeof init.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
    signal: init.signal || AbortSignal.timeout(60000),
  });
  const result: ApiResponse<T> = await response
    .json()
    .catch(() => ({ ok: false, error: { code: 'NETWORK', message: 'Server javobi olinmadi.' } }));
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}
export async function copy(text: string) {
  if (!navigator.clipboard) throw new Error('Nusxalash uchun HTTPS ulanish kerak.');
  await navigator.clipboard.writeText(text);
}
