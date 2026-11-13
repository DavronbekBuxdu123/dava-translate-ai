// @vitest-environment node
import { expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
vi.mock('@/lib/api-context', () => ({ context: vi.fn(async () => ({ id: 'guest-a' })) }));
const { findMany, count, deleteMany, findFirst, upsert } = vi.hoisted(() => ({
  findMany: vi.fn(async () => []),
  count: vi.fn(async () => 0),
  deleteMany: vi.fn(async () => ({ count: 0 })),
  findFirst: vi.fn(async () => null),
  upsert: vi.fn(),
}));
vi.mock('@/lib/db', () => ({
  db: () => ({ translation: { findMany, count, deleteMany, findFirst }, favorite: { upsert } }),
}));
import { GET, DELETE } from '@/app/api/history/route';
import { DELETE as deleteOne } from '@/app/api/history/[id]/route';
import { POST as favorite } from '@/app/api/favorites/route';
it('history query always applies authenticated guest scope', async () => {
  const res = await GET(new NextRequest('http://localhost/api/history?userId=guest-b'));
  expect(res.status).toBe(200);
  expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { guestId: 'guest-a' } }));
});
it('clear-all only deletes current guest rows', async () => {
  await DELETE(new NextRequest('http://localhost/api/history', { method: 'DELETE' }));
  expect(deleteMany).toHaveBeenCalledWith({ where: { guestId: 'guest-a' } });
});
it('foreign history deletion returns 404 and scopes ID', async () => {
  const res = await deleteOne(
    new NextRequest('http://localhost/api/history/foreign', { method: 'DELETE' }),
    { params: Promise.resolve({ id: 'foreign' }) },
  );
  expect(res.status).toBe(404);
  expect(deleteMany).toHaveBeenCalledWith({ where: { id: 'foreign', guestId: 'guest-a' } });
});
it('cannot favorite another guest translation', async () => {
  const res = await favorite(
    new NextRequest('http://localhost/api/favorites', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ translationId: 'foreign' }),
    }),
  );
  expect(res.status).toBe(404);
  expect(findFirst).toHaveBeenCalledWith({ where: { id: 'foreign', guestId: 'guest-a' } });
  expect(upsert).not.toHaveBeenCalled();
});
