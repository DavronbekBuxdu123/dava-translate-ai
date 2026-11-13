'use client';
import { useMemo, useSyncExternalStore } from 'react';
import type { Language } from '@/types';
export const defaults = {
  sourceLang: 'uz' as Language,
  autoplay: false,
  speed: 1,
  autoTranslate: true,
};
export type Preferences = typeof defaults;
function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener('dava-storage', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('dava-storage', callback);
  };
}
function read(key: string) {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}
export function useLocal<T>(key: string, initial: T) {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => '',
  );
  const value = useMemo<T>(() => {
    try {
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  }, [raw, initial]);
  function set(next: T) {
    try {
      localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new Event('dava-storage'));
    } catch {
      /* Settings remain optional when browser storage is disabled. */
    }
  }
  return [value, set] as const;
}
export function usePreferences() {
  const [stored, set] = useLocal<Preferences>('dava-preferences', defaults);
  const preferences: Preferences = {
    sourceLang: stored?.sourceLang === 'ru' ? 'ru' : 'uz',
    autoplay: stored?.autoplay === true,
    speed: [0.75, 1, 1.25, 1.5].includes(stored?.speed) ? stored.speed : 1,
    autoTranslate: stored?.autoTranslate !== false,
  };
  return [preferences, (patch: Partial<Preferences>) => set({ ...preferences, ...patch })] as const;
}
