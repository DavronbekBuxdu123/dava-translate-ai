// @vitest-environment node
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { expect, it } from 'vitest';
async function fixture(failSpeech: boolean) {
  const calls: string[] = [];
  const service = { provider: 'gemini', model: 'test-model', keyConfigured: true };
  const server = createServer(async (request, response) => {
    calls.push(request.url!);
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    if (request.url === '/api/speech' && !failSpeech) {
      response.setHeader('Content-Type', 'audio/wav');
      response.setHeader('X-Dava-Speech-Provider', 'gemini');
      response.end(Buffer.from('test-only-audio'));
      return;
    }
    response.setHeader('Content-Type', 'application/json');
    if (request.url === '/api/ai/status') {
      response.end(
        JSON.stringify({
          ok: true,
          data: {
            revision: 'gemini-audit-2',
            translation: service,
            speech: service,
            transcription: service,
            databaseConfigured: true,
          },
        }),
      );
      return;
    }
    if (request.url === '/api/speech') {
      response.statusCode = 503;
      response.end(JSON.stringify({ ok: false, error: { code: 'VOICE_LIMIT' } }));
      return;
    }
    response.setHeader('X-Dava-AI-Provider', 'gemini');
    response.end(
      JSON.stringify({
        ok: true,
        data: {
          text: 'private-transcript-never-print',
          translatedText: 'private-translation-never-print',
        },
      }),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('server');
  const run = () =>
    promisify(execFile)(process.execPath, ['scripts/check-ai.mjs', '--live'], {
      env: { ...process.env, DAVA_CHECK_URL: `http://127.0.0.1:${address.port}` },
    });
  return {
    calls,
    run,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}
it('live diagnostics checks all three actual HTTP paths without printing text/audio content', async () => {
  const fixtureServer = await fixture(false);
  try {
    const { stdout } = await fixtureServer.run();
    expect(fixtureServer.calls).toEqual([
      '/api/ai/status',
      '/api/translate',
      '/api/speech',
      '/api/transcribe',
    ]);
    expect(stdout).not.toContain('private-transcript-never-print');
    expect(stdout).not.toContain('private-translation-never-print');
    expect(stdout).toContain('OK');
  } finally {
    await fixtureServer.close();
  }
});
it('does not claim transcription was tested when speech creation failed', async () => {
  const fixtureServer = await fixture(true);
  try {
    await expect(fixtureServer.run()).rejects.toMatchObject({
      code: 1,
      stdout: expect.stringContaining('SINOV O‘TKAZILMADI'),
    });
    expect(fixtureServer.calls).not.toContain('/api/transcribe');
  } finally {
    await fixtureServer.close();
  }
});
