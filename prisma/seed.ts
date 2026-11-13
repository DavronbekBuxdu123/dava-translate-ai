import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
// Phrase content is intentionally bundled in src/data/phrases.ts for offline use.
// The seed validates the DB without inserting fabricated private guest history.
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
await db.$queryRaw`SELECT 1`;
console.log('Baza tayyor. Iboralar lokal kutubxonada.');
await db.$disconnect();
