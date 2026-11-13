// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
it('PostgreSQL migration enforces guest relations, unique favorites and cascading deletes', async () => {
  const db = new PGlite();
  try {
    await db.exec(readFileSync('prisma/migrations/202611140001_initial/migration.sql', 'utf8'));
    await db.exec(
      `INSERT INTO "GuestSession" (id,"tokenHash") VALUES ('a','hash-a'),('b','hash-b'); INSERT INTO "Translation" (id,"guestId","sourceText","translatedText","sourceLang","targetLang","requestKey") VALUES ('t','a','Salom','Привет','uz','ru','key'); INSERT INTO "Favorite" (id,"guestId","translationId") VALUES ('f','a','t'); INSERT INTO "Conversation" (id,"guestId") VALUES ('c','a'); INSERT INTO "ConversationMessage" (id,"conversationId","sourceText","translatedText","sourceLang","targetLang") VALUES ('m','c','Salom','Привет','uz','ru');`,
    );
    const own = await db.query('SELECT id FROM "Translation" WHERE "guestId"=$1', ['a']);
    const foreign = await db.query('SELECT id FROM "Translation" WHERE "guestId"=$1', ['b']);
    expect(own.rows).toHaveLength(1);
    expect(foreign.rows).toHaveLength(0);
    await expect(
      db.exec(`INSERT INTO "Favorite" (id,"guestId","translationId") VALUES ('duplicate','a','t')`),
    ).rejects.toThrow();
    await expect(
      db.exec(
        `INSERT INTO "Translation" (id,"guestId","sourceText","translatedText","sourceLang","targetLang","requestKey") VALUES ('bad','missing','x','y','uz','ru','bad')`,
      ),
    ).rejects.toThrow();
    await db.exec(`DELETE FROM "GuestSession" WHERE id='a'`);
    for (const table of ['Translation', 'Favorite', 'Conversation', 'ConversationMessage'])
      expect((await db.query(`SELECT * FROM "${table}"`)).rows).toHaveLength(0);
  } finally {
    await db.close();
  }
}, 20000);
it('offline phrase dataset equals the application dataset', () => {
  expect(JSON.parse(readFileSync('public/offline/phrases.json', 'utf8'))).toEqual(
    JSON.parse(readFileSync('src/data/phrases.json', 'utf8')),
  );
});
