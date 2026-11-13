import 'server-only';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { AppError } from '@/lib/server';
const globalDb = globalThis as unknown as { database?: PrismaClient };
export function db() {
  if (!process.env.DATABASE_URL) throw new AppError('DATABASE_MISSING', 'Tarix va suhbatlar uchun ma’lumotlar bazasi hali ulanmagan.', 503);
  if (!globalDb.database) globalDb.database = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000, max: 5 }) });
  return globalDb.database;
}
